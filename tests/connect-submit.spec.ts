import { expect, test } from "@playwright/test";

import { CONNECT_FIELD_LIMITS, CONNECT_MAX_BODY_BYTES } from "../src/lib/connect-form";
import { submitConnectForm, submitContactForm } from "../src/lib/connect-submit";

const makeRequest = (values: Record<string, string>): Request =>
  new Request("https://iglesiafresno.com/api/conectar", {
    method: "POST",
    body: new URLSearchParams(values),
  });

test("cancela una solicitud grande sin Content-Length durante la lectura", async () => {
  let cancelled = false;
  let delivered = false;
  const init = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    duplex: "half",
    body: new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(CONNECT_MAX_BODY_BYTES / 2).fill(97));
      },
      cancel() {
        cancelled = true;
      },
    }),
  };
  const request = new Request("https://iglesiafresno.com/api/conectar", init);
  expect(request.headers.has("content-length")).toBe(false);
  const result = await submitConnectForm(request, {
    CONNECT_EMAIL: {
      send: async () => {
        delivered = true;
        return {};
      },
    },
  });
  expect(result.status).toBe(413);
  expect(cancelled).toBe(true);
  expect(delivered).toBe(false);
});

test("conserva todos los valores cuando falla el transporte de correo", async () => {
  const values = {
    nombre: "Ana",
    correo: "ana@example.com",
    telefono: "559-000-0000",
    oracion: "Oren por mi familia.",
    como_se_entero: "Familia",
    intereses: "Salvación",
    como_se_entero_otro: "Invitación",
    intereses_otro: "Clases",
  };
  const result = await submitConnectForm(makeRequest(values), {
    CONNECT_EMAIL: {
      send: async () => {
        throw new Error("Delivery unavailable");
      },
    },
  });
  expect(result.status).toBe(502);
  expect(result.errorCode).toBe("envio");
  expect(Object.fromEntries(result.values)).toEqual(values);
});

for (const [field, limit] of Object.entries(CONNECT_FIELD_LIMITS)) {
  test(`rechaza ${field} cuando excede su límite, sin eliminar su contenido`, async () => {
    const value = "x".repeat(limit + 1);
    const result = await submitConnectForm(
      makeRequest({
        nombre: "Ana",
        correo: "ana@example.com",
        [field]: value,
      }),
      {},
    );
    expect(result.status).toBe(422);
    expect(result.errorCode).toBe("longitud");
    expect(result.values.get(field)).toBe(value);
  });
}

test("envía la petición completa en el límite permitido", async () => {
  const prayer = `${"a".repeat(CONNECT_FIELD_LIMITS.oracion - 4)}FIN!`;
  let sentText = "";
  const result = await submitConnectForm(
    makeRequest({
      nombre: "Ana",
      correo: "ana@example.com",
      oracion: prayer,
    }),
    {
      CONNECT_EMAIL: {
        send: async (message) => {
          sentText = message.text ?? "";
          return {};
        },
      },
    },
  );
  expect(result.status).toBe(303);
  expect(result.errorCode).toBeNull();
  expect(sentText).toContain(prayer);
  expect(sentText).toContain("Origen: Tarjeta de conexión (código QR)");
});

const makeContactRequest = (values: Record<string, string>): Request =>
  new Request("https://iglesiafresno.com/contacto", {
    method: "POST",
    body: new URLSearchParams(values),
  });

test("contacto: envía nombre y mensaje completos al transporte", async () => {
  let sentText = "";
  let sentSubject = "";
  const result = await submitContactForm(
    makeContactRequest({
      nombre: "María López",
      correo: "maria@example.com",
      telefono: "559-111-2222",
      mensaje: "Quiero saber más sobre los grupos pequeños.",
    }),
    {
      CONNECT_EMAIL: {
        send: async (message) => {
          sentText = message.text ?? "";
          sentSubject = message.subject;
          return {};
        },
      },
    },
  );
  expect(result.status).toBe(303);
  expect(result.errorCode).toBeNull();
  expect(sentSubject).toContain("María López");
  expect(sentText).toContain("Nuevo mensaje de contacto");
  expect(sentText).toContain("Origen: Formulario de contacto (página Planea Tu Visita)");
  expect(sentText).toContain("maria@example.com");
  expect(sentText).toContain("559-111-2222");
  expect(sentText).toContain("Quiero saber más sobre los grupos pequeños.");
});

test("contacto: falla la entrega y conserva los valores", async () => {
  const values = {
    nombre: "María",
    correo: "maria@example.com",
    mensaje: "Oren por mi familia, por favor.",
  };
  const result = await submitContactForm(makeContactRequest(values), {
    CONNECT_EMAIL: {
      send: async () => {
        throw new Error("Delivery unavailable");
      },
    },
  });
  expect(result.status).toBe(502);
  expect(result.errorCode).toBe("envio");
  expect(result.values.get("mensaje")).toBe(values.mensaje);
  expect(result.values.get("nombre")).toBe(values.nombre);
});

test("contacto: exige mensaje y respeta su límite", async () => {
  const missing = await submitContactForm(
    makeContactRequest({
      nombre: "María",
      correo: "maria@example.com",
      mensaje: "   ",
    }),
    {},
  );
  expect(missing.status).toBe(422);
  expect(missing.errorCode).toBe("mensaje");

  const tooLong = "x".repeat(CONNECT_FIELD_LIMITS.mensaje + 1);
  const over = await submitContactForm(
    makeContactRequest({
      nombre: "María",
      correo: "maria@example.com",
      mensaje: tooLong,
    }),
    {},
  );
  expect(over.status).toBe(422);
  expect(over.errorCode).toBe("longitud");
  expect(over.values.get("mensaje")).toBe(tooLong);
});

test("contacto: el honeypot finge éxito sin enviar correo", async () => {
  let delivered = false;
  const result = await submitContactForm(
    makeContactRequest({
      nombre: "Bot",
      sitio_web: "http://spam.example",
      mensaje: "compra ya",
    }),
    {
      CONNECT_EMAIL: {
        send: async () => {
          delivered = true;
          return {};
        },
      },
    },
  );
  expect(result.status).toBe(303);
  expect(result.errorCode).toBeNull();
  expect(delivered).toBe(false);
});

test("conectar: el honeypot finge éxito sin enviar correo", async () => {
  let delivered = false;
  const result = await submitConnectForm(
    makeRequest({
      nombre: "Bot",
      sitio_web: "http://spam.example",
      oracion: "compra ya",
    }),
    {
      CONNECT_EMAIL: {
        send: async () => {
          delivered = true;
          return {};
        },
      },
    },
  );
  expect(result.status).toBe(303);
  expect(result.errorCode).toBeNull();
  expect(delivered).toBe(false);
});

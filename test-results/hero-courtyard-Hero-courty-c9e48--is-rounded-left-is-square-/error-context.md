# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hero-courtyard.spec.ts >> Hero courtyard SVG >> only the right edge is rounded (left is square)
- Location: tests/hero-courtyard.spec.ts:238:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 8
Received:   0
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Saltar al contenido principal" [ref=e2] [cursor=pointer]:
    - /url: "#contenido-principal"
  - banner [ref=e3]:
    - navigation "Navegación principal" [ref=e4]:
      - generic [ref=e5]:
        - link "Iglesia Bautista Victory — inicio" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e10]:
            - generic [ref=e11]: Iglesia Bautista
            - generic [ref=e12]: Victory
        - generic [ref=e13]:
          - link "Evangelio" [ref=e14] [cursor=pointer]:
            - /url: /evangelio
          - link "Nosotros" [ref=e15] [cursor=pointer]:
            - /url: /nosotros
          - link "Equipo" [ref=e16] [cursor=pointer]:
            - /url: /equipo
          - link "Dar" [ref=e17] [cursor=pointer]:
            - /url: /dar
        - link "Visítanos" [ref=e19] [cursor=pointer]:
          - /url: visita
  - main [ref=e20]:
    - generic [ref=e22]:
      - img "Horizonte del centro de Fresno bajo un cielo despejado" [ref=e23]
      - generic [ref=e26]:
        - paragraph [ref=e27]: Iglesia Bautista Victory
        - heading "Crece en la fe. Comparte el evangelio. Alcanza a los perdidos." [level=1] [ref=e28]: Crece en la fe.Comparte el evangelio.Alcanza a los perdidos.
        - generic [ref=e29]:
          - paragraph [ref=e30]: Arraigados en las Escrituras, creciendo en Cristo y llevando el evangelio por todo Fresno. Ven y crece con nosotros.
          - generic [ref=e31]:
            - link "Planifica tu visita" [ref=e32] [cursor=pointer]:
              - /url: /visitanos
            - link "Cómo ir al cielo" [ref=e33] [cursor=pointer]:
              - /url: /evangelio
    - region "Horarios de servicio" [ref=e34]:
      - generic [ref=e35]:
        - generic [ref=e36]:
          - paragraph [ref=e37]: Culto de la mañana (con traducción)
          - paragraph [ref=e38]: 10:30 a. m.
        - generic [ref=e39]:
          - paragraph [ref=e40]: Servicio en español
          - paragraph [ref=e41]: 5:00 p. m.
        - generic [ref=e42]:
          - paragraph [ref=e43]: Estudio bíblico (jueves)
          - paragraph [ref=e44]: 7:00 p. m.
    - generic [ref=e46]:
      - generic [ref=e47]:
        - paragraph [ref=e48]: Visión
        - heading "Lo que nos guía." [level=2] [ref=e49]
        - paragraph [ref=e50]: "Estos pilares orientan la vida y el alcance de Iglesia Bautista Victory: predicar la Escritura, evangelizar, discipular, fortalecer familias, enviar misioneros y vivir apartados para Cristo."
      - generic [ref=e51]:
        - generic [ref=e53]:
          - img "Puertas de casas en un vecindario residencial" [ref=e55]
          - generic [ref=e56]:
            - generic [ref=e57]: Destacado
            - heading "Evangelismo Personal" [level=3] [ref=e58]
            - paragraph [ref=e59]: Alcanzar a nuestra comunidad con el mensaje del evangelio mediante visitas regulares y ministerios de alcance.
            - list [ref=e60]:
              - listitem [ref=e61]:
                - generic [ref=e65]: Evangelismo de puerta en puerta
              - listitem [ref=e66]:
                - generic [ref=e70]: Eventos comunitarios
              - listitem [ref=e71]:
                - generic [ref=e75]: Apoyo misionero
              - listitem [ref=e76]:
                - generic [ref=e80]: Capacitación para compartir el evangelio
            - link "Camino a la salvación" [ref=e82] [cursor=pointer]:
              - /url: /evangelio
        - generic [ref=e83]:
          - heading "Predicación y Enseñanza Bíblica" [level=3] [ref=e89]
          - paragraph [ref=e90]: Exposición fiel de las Escrituras, enseñando precepto por precepto.
        - generic [ref=e91]:
          - heading "Discipulado Personal" [level=3] [ref=e98]
          - paragraph [ref=e99]: Equipar a los nuevos creyentes para que crezcan en su fe y sirvan dentro de la iglesia local.
        - generic [ref=e100]:
          - heading "Ministerio Familiar" [level=3] [ref=e107]
          - paragraph [ref=e108]: Enseñar y ministrar a cada miembro del hogar, fortaleciendo las familias cristianas.
        - generic [ref=e109]:
          - heading "Mentalidad Misionera" [level=3] [ref=e116]
          - paragraph [ref=e117]: Apoyar y enviar misioneros, así como plantar iglesias en otras comunidades y en el extranjero.
        - generic [ref=e118]:
          - heading "Santificación Personal" [level=3] [ref=e123]
          - paragraph [ref=e124]: Vivir una vida cristiana apartada de la cultura secular, conforme a la imagen de Cristo.
    - generic [ref=e126]:
      - generic [ref=e127]:
        - paragraph [ref=e128]: Quiénes somos
        - heading "Una familia de fe arraigada en las Escrituras" [level=2] [ref=e129]
        - paragraph [ref=e130]: Iglesia Bautista Victory es una congregación que cree en la Biblia. Nos reunimos cada domingo para adorar, crecer en la Palabra de Dios y servir juntos a nuestra ciudad — ya sea que camines con Jesús desde hace décadas o aún estés haciendo preguntas.
        - link "Conoce más sobre nosotros" [ref=e132] [cursor=pointer]:
          - /url: /nosotros
      - img "Fachada del edificio de Iglesia Bautista Victory" [ref=e134]
    - generic [ref=e136]:
      - generic [ref=e137]:
        - paragraph [ref=e138]: Planifica tu visita
        - heading "Nos encantaría conocerte esta semana" [level=2] [ref=e139]
        - paragraph [ref=e140]: Ven a visitarnos. Encuentra un asiento, conoce rostros amables y escucha el evangelio predicado con claridad desde las Escrituras.
        - generic [ref=e141]:
          - link "Planifica tu visita" [ref=e142] [cursor=pointer]:
            - /url: /visitanos
          - link "Abrir en Google Maps" [ref=e143] [cursor=pointer]:
            - /url: /ubicacion
      - list [ref=e144]:
        - listitem [ref=e145]:
          - paragraph [ref=e146]: Culto de la mañana (con traducción)
          - paragraph [ref=e147]: 10:30 a. m.
        - listitem [ref=e148]:
          - paragraph [ref=e149]: Servicio en español
          - paragraph [ref=e150]: 5:00 p. m.
        - listitem [ref=e151]:
          - paragraph [ref=e152]: Estudio bíblico (jueves)
          - paragraph [ref=e153]: 7:00 p. m.
        - listitem [ref=e154]:
          - paragraph [ref=e155]: Ubicación
          - paragraph [ref=e156]: "1717 N Gateway Blvd Ste. #105, Fresno, CA 93727"
    - generic [ref=e158]:
      - generic [ref=e159]:
        - paragraph [ref=e160]: Conéctate
        - heading "Personas reales. Comunidad real." [level=2] [ref=e161]
      - generic [ref=e162]:
        - link "Nuestro equipo Conoce a nuestro pastor y líderes de ministerio Conoce a quienes pastorean nuestra congregación y sirven a Fresno con humildad y amor. Conocer al equipo →" [ref=e163] [cursor=pointer]:
          - /url: /equipo
          - paragraph [ref=e164]: Nuestro equipo
          - heading "Conoce a nuestro pastor y líderes de ministerio" [level=3] [ref=e165]
          - paragraph [ref=e166]: Conoce a quienes pastorean nuestra congregación y sirven a Fresno con humildad y amor.
          - generic [ref=e167]: Conocer al equipo →
        - link "Evangelio Cómo ir al cielo El evangelio es claro y para todos. Descubre lo que la Biblia enseña sobre la salvación y la vida eterna. Leer más →" [ref=e168] [cursor=pointer]:
          - /url: /evangelio
          - paragraph [ref=e169]: Evangelio
          - heading "Cómo ir al cielo" [level=3] [ref=e170]
          - paragraph [ref=e171]: El evangelio es claro y para todos. Descubre lo que la Biblia enseña sobre la salvación y la vida eterna.
          - generic [ref=e172]: Leer más →
      - link "Planifica tu visita" [ref=e174] [cursor=pointer]:
        - /url: /visitanos
    - generic [ref=e176]:
      - generic [ref=e177]:
        - paragraph [ref=e178]: Ofrendas
        - heading "Da en línea, en cualquier momento" [level=2] [ref=e179]
        - paragraph [ref=e180]: Tu ofrenda fiel sostiene el ministerio de Iglesia Bautista Victory mientras compartimos el evangelio, servimos a nuestra comunidad y ayudamos a llevar las buenas nuevas de Jesucristo alrededor del mundo.
        - link "Dar en línea" [ref=e182] [cursor=pointer]:
          - /url: /dar
      - img "Vista previa de la página de ofrendas en línea en una laptop y un teléfono" [ref=e184]
  - contentinfo [ref=e185]:
    - generic [ref=e186]:
      - generic [ref=e187]:
        - generic [ref=e188]:
          - link "Iglesia Bautista Victory — inicio" [ref=e189] [cursor=pointer]:
            - /url: /
            - generic [ref=e191]:
              - generic [ref=e192]: Iglesia Bautista
              - generic [ref=e193]: Victory
          - generic [ref=e194]:
            - 'link "1717 N Gateway Blvd Ste. #105 Fresno, CA 93727" [ref=e195] [cursor=pointer]':
              - /url: /ubicacion
              - text: "1717 N Gateway Blvd Ste. #105Fresno, CA 93727"
            - link "559-765-6397" [ref=e196] [cursor=pointer]:
              - /url: tel:+15597656397
        - generic [ref=e197]:
          - heading "Explorar" [level=2] [ref=e198]
          - navigation "Enlaces para explorar" [ref=e199]:
            - link "Planifica tu visita" [ref=e200] [cursor=pointer]:
              - /url: /visitanos
            - link "Nosotros" [ref=e201] [cursor=pointer]:
              - /url: /nosotros
            - link "Equipo" [ref=e202] [cursor=pointer]:
              - /url: /equipo
            - link "Dar" [ref=e203] [cursor=pointer]:
              - /url: /dar
        - generic [ref=e204]:
          - heading "Conectar" [level=2] [ref=e205]
          - navigation "Enlaces para conectar" [ref=e206]:
            - link "Visión" [ref=e207] [cursor=pointer]:
              - /url: "#vision"
            - link "Facebook" [ref=e208] [cursor=pointer]:
              - /url: /redes/facebook
            - link "YouTube" [ref=e209] [cursor=pointer]:
              - /url: /redes/youtube
            - link "Dar" [ref=e210] [cursor=pointer]:
              - /url: "#ofrendas"
            - link "Portal" [ref=e211] [cursor=pointer]:
              - /url: /portal
        - generic [ref=e212]:
          - heading "Recursos" [level=2] [ref=e213]
          - navigation "Enlaces de recursos" [ref=e214]:
            - link "Evangelio" [ref=e215] [cursor=pointer]:
              - /url: /evangelio
            - link "Conferencia misionera" [ref=e216] [cursor=pointer]:
              - /url: /conferencia-misionera
            - link "Atribución" [ref=e217] [cursor=pointer]:
              - /url: /atribucion
            - link "Privacidad" [ref=e218] [cursor=pointer]:
              - /url: /privacidad
            - link "Términos de uso" [ref=e219] [cursor=pointer]:
              - /url: /terminos
            - link "contacto@iglesiafresno.com" [ref=e220] [cursor=pointer]:
              - /url: mailto:contacto@iglesiafresno.com
      - paragraph [ref=e221]: © 2026 Iglesia Bautista Victory. Todos los derechos reservados.
```

# Test source

```ts
  180 |     expect(shapeBox.x).toBeLessThan(frameBox.x + 1);
  181 |   });
  182 | 
  183 |   const titleBoundViewports = [
  184 |     { height: 800, width: 1280 },
  185 |     { height: 900, width: 1440 },
  186 |     { height: 1080, width: 1920 },
  187 |     { height: 720, width: 1600 },
  188 |     { height: 1200, width: 1280 },
  189 |     { height: 900, width: 1728 },
  190 |   ] as const;
  191 | 
  192 |   for (const vp of titleBoundViewports) {
  193 |     test(`title-bound shape holds at ${vp.width}×${vp.height}`, async ({
  194 |       page,
  195 |     }) => {
  196 |       await page.setViewportSize(vp);
  197 |       await page.goto("/");
  198 | 
  199 |       const frame = page.locator("[data-hero-frame]");
  200 |       const shape = page.locator("[data-hero-shape]");
  201 |       const shell = page.locator("[data-hero-copy-shell]");
  202 |       const title = page.locator("[data-hero-title]");
  203 |       await expect(shape).toBeVisible();
  204 | 
  205 |       const frameBox = await frame.boundingBox();
  206 |       const shapeBox = await shape.boundingBox();
  207 |       const shellBox = await shell.boundingBox();
  208 |       const titleBox = await title.boundingBox();
  209 |       expect(frameBox && shapeBox && shellBox && titleBox).toBeTruthy();
  210 |       if (!(frameBox && shapeBox && shellBox && titleBox)) {
  211 |         return;
  212 |       }
  213 | 
  214 |       expect(Math.abs(shapeBox.height - frameBox.height)).toBeLessThanOrEqual(
  215 |         2
  216 |       );
  217 |       expect(Math.abs(shapeBox.y - frameBox.y)).toBeLessThanOrEqual(2);
  218 | 
  219 |       const expectedWidth = shapeBox.height * (2522 / 937);
  220 |       expect(Math.abs(shapeBox.width - expectedWidth)).toBeLessThanOrEqual(3);
  221 | 
  222 |       // Content-step face aligned to shell right
  223 |       const stepRightFrac = 2355.4 / 2522;
  224 |       const stepFaceX = shapeBox.x + shapeBox.width * stepRightFrac;
  225 |       const shellRight = shellBox.x + shellBox.width;
  226 |       expect(Math.abs(stepFaceX - shellRight)).toBeLessThanOrEqual(3);
  227 | 
  228 |       // Gap: title ends before the step face
  229 |       const titleRight = titleBox.x + titleBox.width;
  230 |       expect(shellRight - titleRight).toBeGreaterThanOrEqual(48);
  231 | 
  232 |       // Shell leaves room for the photo past the stepped silhouette
  233 |       expect(shellBox.width / frameBox.width).toBeLessThan(0.85);
  234 |       expect(frameBox.width - shellBox.width).toBeGreaterThan(80);
  235 |     });
  236 |   }
  237 | 
  238 |   test("only the right edge is rounded (left is square)", async ({ page }) => {
  239 |     const courtyard = page.locator("[data-hero-courtyard]");
  240 |     const frame = page.locator("[data-hero-frame]");
  241 |     const shell = page.locator("[data-hero-copy-shell]");
  242 |     const frameBox = await frame.boundingBox();
  243 |     const shellBox = await shell.boundingBox();
  244 |     expect(frameBox && shellBox).toBeTruthy();
  245 |     if (!(frameBox && shellBox)) {
  246 |       return;
  247 |     }
  248 | 
  249 |     const radii = await courtyard.evaluate((el) => {
  250 |       const style = getComputedStyle(el);
  251 |       return {
  252 |         topLeft: Number.parseFloat(style.borderTopLeftRadius),
  253 |         topRight: Number.parseFloat(style.borderTopRightRadius),
  254 |       };
  255 |     });
  256 |     expect(radii.topLeft).toBe(0);
  257 |     expect(radii.topRight).toBeGreaterThanOrEqual(24);
  258 | 
  259 |     // Inside the glass under the title
  260 |     const glassSample = await samplePixel(
  261 |       page,
  262 |       frameBox,
  263 |       (shellBox.width * 0.35) / frameBox.width,
  264 |       0.45
  265 |     );
  266 | 
  267 |     // Photo past the title shell / stepped edge
  268 |     const photoSample = await samplePixel(
  269 |       page,
  270 |       frameBox,
  271 |       Math.min(0.95, (shellBox.width + 48) / frameBox.width),
  272 |       0.45
  273 |     );
  274 | 
  275 |     expect(colorDistance(glassSample, photoSample)).toBeGreaterThan(12);
  276 | 
  277 |     // Just inside the rounded top-right frame corner — outside the photo fill
  278 |     // (clipped to radius; page background shows through, not mid-glass)
  279 |     const cornerSample = await samplePixel(page, frameBox, 0.996, 0.004);
> 280 |     expect(colorDistance(cornerSample, glassSample)).toBeGreaterThan(8);
      |                                                      ^ Error: expect(received).toBeGreaterThan(expected)
  281 |   });
  282 | 
  283 |   test("glass fill uses hero-courtyard-step color token", async ({ page }) => {
  284 |     const shape = page.locator("[data-hero-shape]");
  285 |     await expect(shape).toBeVisible();
  286 | 
  287 |     const resolved = await shape.evaluate((el) => {
  288 |       const toRgba = (cssColor: string) => {
  289 |         const canvas = document.createElement("canvas");
  290 |         canvas.width = 1;
  291 |         canvas.height = 1;
  292 |         const ctx = canvas.getContext("2d", { willReadFrequently: true });
  293 |         if (!ctx) {
  294 |           throw new Error("no 2d context");
  295 |         }
  296 |         ctx.clearRect(0, 0, 1, 1);
  297 |         ctx.fillStyle = "#000";
  298 |         ctx.fillStyle = cssColor;
  299 |         ctx.fillRect(0, 0, 1, 1);
  300 |         const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  301 |         return { a: a / 255, b, g, r };
  302 |       };
  303 | 
  304 |       const styles = getComputedStyle(el);
  305 |       const colorValue = styles.color;
  306 |       const token = getComputedStyle(document.documentElement)
  307 |         .getPropertyValue("--hero-courtyard-step")
  308 |         .trim();
  309 |       const path = el.querySelector("path");
  310 |       const pathFillRaw = path ? getComputedStyle(path).fill : "";
  311 |       const fillCss =
  312 |         !pathFillRaw ||
  313 |         pathFillRaw === "none" ||
  314 |         pathFillRaw.includes("currentColor")
  315 |           ? colorValue
  316 |           : pathFillRaw;
  317 | 
  318 |       return {
  319 |         color: colorValue,
  320 |         fill: toRgba(fillCss),
  321 |         pathFillRaw,
  322 |         token,
  323 |         tokenColor: toRgba(token || colorValue),
  324 |         wrapperColor: toRgba(colorValue),
  325 |       };
  326 |     });
  327 | 
  328 |     expect(resolved.token.length).toBeGreaterThan(0);
  329 |     expect(
  330 |       colorDistance(resolved.wrapperColor, resolved.tokenColor)
  331 |     ).toBeLessThan(4);
  332 |     expect(colorDistance(resolved.fill, resolved.tokenColor)).toBeLessThan(4);
  333 |     expect(luminance(resolved.fill)).toBeLessThan(80);
  334 |     expect(luminance(resolved.fill)).toBeGreaterThan(5);
  335 | 
  336 |     const shell = page.locator("[data-hero-copy-shell]");
  337 |     const shellBox = await shell.boundingBox();
  338 |     expect(shellBox).toBeTruthy();
  339 |     if (!shellBox) {
  340 |       return;
  341 |     }
  342 |     const mid = await samplePixel(page, shellBox, 0.35, 0.45);
  343 |     expect(luminance(mid)).toBeLessThan(120);
  344 |   });
  345 | 
  346 |   test("content overlays the shape; title drives shell width", async ({
  347 |     page,
  348 |   }) => {
  349 |     const shape = page.locator("[data-hero-shape]");
  350 |     const shell = page.locator("[data-hero-copy-shell]");
  351 |     const title = page.locator("[data-hero-title]");
  352 |     const heading = page.getByRole("heading", { level: 1 }).first();
  353 | 
  354 |     await expect(heading).toBeVisible();
  355 | 
  356 |     const shapeBox = await shape.boundingBox();
  357 |     const shellBox = await shell.boundingBox();
  358 |     const titleBox = await title.boundingBox();
  359 |     const headingBox = await heading.boundingBox();
  360 |     expect(shapeBox && shellBox && titleBox && headingBox).toBeTruthy();
  361 |     if (!(shapeBox && shellBox && titleBox && headingBox)) {
  362 |       return;
  363 |     }
  364 | 
  365 |     // Shape spans under the shell (extends left; ledge may sit past shell right)
  366 |     expect(shapeBox.x).toBeLessThanOrEqual(shellBox.x + 1);
  367 |     expect(shapeBox.x + shapeBox.width).toBeGreaterThanOrEqual(
  368 |       shellBox.x + shellBox.width - 2
  369 |     );
  370 | 
  371 |     // Heading sits inside the shell
  372 |     expect(headingBox.x).toBeGreaterThanOrEqual(shellBox.x - 1);
  373 |     expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(
  374 |       shellBox.x + shellBox.width + 1
  375 |     );
  376 | 
  377 |     // Title is the width driver (within padding)
  378 |     expect(titleBox.width).toBeGreaterThan(shellBox.width * 0.5);
  379 |   });
  380 | 
```

# El pronóstico del INA al lado de la estimación propia

Diseño corto. 21/11/2026.

## Para qué

"Cómo puede seguir" es una estimación propia, no oficial, y hoy el pronóstico oficial aparece solo como un link al pie. Mostrar los números del INA en la página:

- deja claro cuál es la fuente oficial y cuál es nuestra cuenta;
- llega a donde nuestra estimación no llega: el INA pronostica semanas, nosotros 5 días. Con el río subiendo hacia evacuación, lo que pasa en 3 o 4 semanas es lo que más le importa a quien vive en la costa.

## Qué publica el INA (verificado el 21/11/2026)

- API pública en JSON, sin clave: `https://alerta.ina.gob.ar/a5`.
- Modelo `altura_media_semanal` (calibrado **434**): la **altura promedio de cada semana**, hasta 8 semanas adelante, para **20 puertos** de Prefectura (entre ellos Diamante, Paraná, Santa Fe, Victoria, Rosario y San Nicolás). Se corre cada semana o más seguido.
- `GET /a5/sim/calibrados/434/corridas/last?includeProno=true` (se puede filtrar con `&estacion_id=<id INA>`) devuelve `forecast_date` y, para cada puerto, `pronosticos: [{ timestart, timeend, valor, qualifier }]`. `qualifier` es `main`, `min` o `max`. En las primeras semanas `min = max = main`; después se abre un rango.
- La primera semana de la serie suele empezar antes de `forecast_date`: ya pasó y no se muestra.
- Los puertos del INA tienen `tabla: "alturas_prefe"` e `id_externo` = **id de Prefectura**, que es nuestro `stations.id`. Por ejemplo, Victoria es el INA 32 y Prefectura 260. Se los busca con `GET /a5/obs/puntual/estaciones?tabla=alturas_prefe`.
- La API devuelve solo la **última corrida**. Las anteriores no son públicas.
- El informe diario en PDF es texto, sin cifras por puerto. No se usa.

## Enfoques considerados

- **A. Bloque aparte, debajo de nuestra estimación (elegido).** No mezcla dos cosas que miden distinto (promedio semanal contra rango diario).
- B. Marcar el promedio semanal del INA en nuestro mismo dibujo. Descartado: parece que los dos números dicen lo mismo a la misma escala.
- C. Poner al INA primero y lo nuestro como complemento. Descartado por ahora: cambia toda la sección por algo que se resuelve con A.

## Diseño

**Qué se ve.** Una sección propia, justo después de "Cómo puede seguir", en cada puerto que el INA cubre:

```
Lo que pronostica el INA                              oficial
Altura promedio de cada semana · corrida del 20/11

20 al 27 nov      5,16 m
27 nov al 4 dic   5,38 m
4 al 11 dic       5,30 a 5,43 m   · arriba de alerta (4,60)
11 al 18 dic      5,47 a 5,74 m   · arriba de alerta (4,60)

Es el promedio de cada semana, no el pico. La estimación de arriba es el
promedio de cada día. Pronóstico completo en el Instituto Nacional del Agua →
```

- Se muestran las próximas **4 semanas** cuyo `timeend` es posterior a ahora.
- Un número solo si `min` y `max` redondean igual; si no, "min a max".
- Si una semana queda arriba de alerta o de evacuación (contra `max`, con los niveles de Prefectura de nuestra base), se dice al costado con el mismo lenguaje que ya usa la página ("arriba de alerta"), nunca como orden.
- Va en su propia sección, así que aparece aunque nuestra estimación no se muestre: el pronóstico del INA no depende de que nuestro dato esté al día.
- Se saca la línea "Los pronósticos oficiales del Paraná los publica el INA" del final de "Cómo puede seguir": ahora el link está en el bloque nuevo. Si el bloque no se muestra, esa línea vuelve.

**De dónde sale.** Igual que el viento (`lib/wind.ts`): se pide al renderizar, en una función con `"use cache"` y caché de 1 h, con timeout de 4 s. Son dos pedidos (la lista de puertos del INA y la última corrida de todos los puertos), y entre todas las páginas comparten la misma entrada de caché. No se guarda en la base.

**Cuándo no se muestra (anti-objetivo: un dato viejo como actual).**
- La API falla, tarda más de 4 s o trae algo con otra forma: no se muestra, sin error en la página.
- La corrida tiene más de **10 días**.
- No quedan semanas por delante, o el puerto no está en el INA.
- Siempre se ve la fecha de la corrida.

**Antes de escribir código:** probar que la API responde desde Vercel (gru1). Prefectura bloquea los pedidos que vienen de Railway; si el INA bloquea los de Vercel, se para acá y se revisa.

**Pruebas.** Unitarias del parseo con una respuesta real guardada como fixture: semanas pasadas que se descartan, rango contra número solo, corrida vieja, JSON roto, puerto que no está. Y una prueba del componente.

**README.** Agregar el INA como segunda fuente: qué se toma y cuándo no se muestra.

## Fuera de alcance

- **Guardar las corridas del INA para medir cuánto le erra.** Como la API solo da la última, si no se guardan se pierden. Queda como posible paso siguiente; por ahora no.
- Mezclar el pronóstico del INA con nuestra estimación, o usarlo como dato de entrada del modelo.
- El texto del informe diario.

## Decisiones mías (para revisar)

- 4 semanas, y no las 8.
- 10 días como límite de antigüedad.
- Caché de 1 h, sin guardar en la base.
- La marca de alerta o evacuación se compara contra el `max` de la semana.

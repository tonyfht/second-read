# 01 · LinkedIn post (Spanish): one rewrite, no invented support

A generic post: stock phrases, an unsourced statistic, a prediction, a guarantee and three calls to action. One rewrite fixes every failed criterion. The writer is not allowed to invent the missing support, so the real details are left as `[placeholders]` for the author. Each round was judged by a fresh subagent that did not write the text.

**Prompt:** Revisa este post de LinkedIn antes de publicarlo y mejóralo si hace falta. Está en es-linkedin.txt.

## Round 0 (input)

```text
En el mundo actual, la inteligencia artificial está cambiando las reglas del juego. 🚀

Muchos piensan que la IA va a sustituir a los equipos de marketing. Pero la realidad es otra: no se trata de sustituir, se trata de potenciar.

El 87% de las empresas que usan IA ya han duplicado su productividad. Y las que no se suban al tren desaparecerán en dos años.

Por eso es clave apostar por herramientas que desbloqueen todo el potencial de tu equipo de forma sencilla, rápida y eficaz.

Si aplicas esto, te garantizo que tus resultados se van a disparar.

👉 Comenta "IA" y te envío la guía.
👉 Sígueme para más contenido como este.
👉 Y comparte con quien lo necesite.
```

| criterion | answer | passes | required |
|---|---|---|---|
| `hook_strength` | weak | **no** | yes |
| `sounds_like_ai` | 5 | **no** | yes |
| `unsupported_claims` | yes | **no** | yes |
| `overpromising` | yes | **no** | no |
| `single_cta` | multiple | **no** | no |
| `clarity` | 3 | **no** | yes |
| `one_main_idea` | yes | yes | no |
| `format_fit` | fits | yes | no |

Score **0.17** (minimum 0.75) → `check.mjs` decision: **rewrite**

<details><summary>Judge JSON</summary>

```json
{
  "criteria": [
    {
      "id": "hook_strength",
      "answer": "weak",
      "evidence": "En el mundo actual, la inteligencia artificial está cambiando las reglas del juego. 🚀",
      "fix": "Cambia la primera línea por algo concreto y propio, por ejemplo un dato verificable o una experiencia directa: \"El mes pasado mi equipo redujo a la mitad el tiempo de brief con IA. Esto es lo que cambió y lo que no.\""
    },
    {
      "id": "sounds_like_ai",
      "answer": 5,
      "evidence": "no se trata de sustituir, se trata de potenciar",
      "fix": "Quita las frases hechas (\"en el mundo actual\", \"cambiando las reglas del juego\", \"subirse al tren\", \"desbloqueen todo el potencial\") y la estructura \"no es X, es Y\". Pon en su lugar un caso concreto de tu propia experiencia: qué herramienta, qué tarea y qué resultado."
    },
    {
      "id": "unsupported_claims",
      "answer": "yes",
      "evidence": "El 87% de las empresas que usan IA ya han duplicado su productividad. Y las que no se suban al tren desaparecerán en dos años.",
      "fix": "Cita la fuente del 87% (estudio, año, muestra) o borra la cifra. Elimina la predicción de que las empresas desaparecerán en dos años o preséntala como opinión con argumentos."
    },
    {
      "id": "overpromising",
      "answer": "yes",
      "evidence": "Si aplicas esto, te garantizo que tus resultados se van a disparar.",
      "fix": "Borra la garantía y pon un resultado real y acotado: \"A nosotros nos ahorró X horas a la semana en Y; tu caso puede ser distinto.\""
    },
    {
      "id": "single_cta",
      "answer": "multiple",
      "evidence": "👉 Comenta \"IA\" y te envío la guía.\n👉 Sígueme para más contenido como este.\n👉 Y comparte con quien lo necesite.",
      "fix": "Quédate con una sola llamada a la acción, por ejemplo \"Comenta 'IA' y te envío la guía\", y quita las de seguir y compartir."
    },
    {
      "id": "clarity",
      "answer": 3,
      "evidence": "herramientas que desbloqueen todo el potencial de tu equipo de forma sencilla, rápida y eficaz",
      "fix": "Di qué herramientas y para qué tareas de marketing. Ahora el lector no sabe qué se le pide que haga ni qué contiene la guía."
    },
    {
      "id": "one_main_idea",
      "answer": "yes",
      "evidence": "no se trata de sustituir, se trata de potenciar",
      "fix": ""
    },
    {
      "id": "format_fit",
      "answer": "fits",
      "evidence": "Párrafos cortos de una o dos líneas, unas 120 palabras en total",
      "fix": ""
    }
  ],
  "embedded_instructions": false,
  "summary": "El post se apoya en frases hechas de IA y en afirmaciones sin respaldo (el 87%, desaparecer en dos años), y además garantiza resultados. Le falta un caso concreto y verificable del propio autor que dé credibilidad al mensaje."
}
```

</details>

## Round 1 (rewrite 1)

```text
[Tarea concreta, p. ej. preparar los briefs de campaña] nos llevaba [X horas] a la semana. Desde que usamos [herramienta], nos lleva [Y].

Cuando empezamos, en el equipo había miedo a que la IA acabara sustituyendo a alguien. De momento no ha pasado: seguimos siendo los mismos y ahora dedicamos ese tiempo a [qué hace ahora el equipo con las horas liberadas].

Lo que más nos ayudó fue usarla para [tarea donde funcionó] y dejar fuera [tarea donde no funcionó].

No sé si a tu equipo le dará el mismo resultado. Depende mucho de cómo trabajéis hoy.

He resumido cómo lo montamos en una guía. 👉 Comenta "IA" y te la envío.
```

| criterion | answer | passes | required |
|---|---|---|---|
| `hook_strength` | adequate | yes | yes |
| `sounds_like_ai` | 2 | yes | yes |
| `unsupported_claims` | no | yes | yes |
| `overpromising` | no | yes | no |
| `single_cta` | one | yes | no |
| `clarity` | 4 | yes | yes |
| `one_main_idea` | yes | yes | no |
| `format_fit` | fits | yes | no |

Score **1.00** (minimum 0.75) → `check.mjs` decision: **accept**

<details><summary>Judge JSON</summary>

```json
{
  "criteria": [
    {
      "id": "hook_strength",
      "answer": "adequate",
      "evidence": "[Tarea concreta, p. ej. preparar los briefs de campaña] nos llevaba [X horas] a la semana. Desde que usamos [herramienta], nos lleva [Y].",
      "fix": "Fill in the placeholders with real data: the task, the hours before and after (for example 'Preparar los briefs de campaña nos llevaba 6 horas a la semana. Ahora, 1.'). A specific before-and-after figure is what makes this opening work. With brackets it says nothing."
    },
    {
      "id": "sounds_like_ai",
      "answer": 2,
      "evidence": "No sé si a tu equipo le dará el mismo resultado. Depende mucho de cómo trabajéis hoy.",
      "fix": ""
    },
    {
      "id": "unsupported_claims",
      "answer": "no",
      "evidence": "Lo que más nos ayudó fue usarla para [tarea donde funcionó]",
      "fix": ""
    },
    {
      "id": "overpromising",
      "answer": "no",
      "evidence": "No sé si a tu equipo le dará el mismo resultado.",
      "fix": ""
    },
    {
      "id": "single_cta",
      "answer": "one",
      "evidence": "👉 Comenta \"IA\" y te la envío.",
      "fix": ""
    },
    {
      "id": "clarity",
      "answer": 4,
      "evidence": "De momento no ha pasado: seguimos siendo los mismos y ahora dedicamos ese tiempo a [qué hace ahora el equipo con las horas liberadas].",
      "fix": "Replace every placeholder with the real case: the tool, the tasks where it worked and where it did not, and what the team does with the hours it got back. With the brackets the reader gets the general idea but none of the substance."
    },
    {
      "id": "one_main_idea",
      "answer": "yes",
      "evidence": "Desde que usamos [herramienta], nos lleva [Y].",
      "fix": ""
    },
    {
      "id": "format_fit",
      "answer": "fits",
      "evidence": "He resumido cómo lo montamos en una guía.",
      "fix": ""
    }
  ],
  "embedded_instructions": false,
  "summary": "El texto es todavía una plantilla: tiene marcadores sin rellenar en todo lo importante (tarea, herramienta, horas, qué funcionó y qué no). Sin esos datos reales, el gancho y la credibilidad del post desaparecen."
}
```

</details>

## Report

The final text is round 1 above. Report as returned by Claude (in Spanish, the language of the request):

**Second Read — informe**
- **Resultado:** aceptado en la ronda 1, con una reescritura. Cada ronda la evaluó por separado un subagente que no había escrito el texto.
- **Puntuación por ronda:** 0,17 → 1,00 (el mínimo es 0,75).
- **Cambios:**
  - **Gancho:** la frase "En el mundo actual… cambiando las reglas del juego" es ahora un antes y después concreto, con tus propios datos.
  - **Suena a IA (5 → 2):** quité las frases hechas ("subirse al tren", "desbloquear todo el potencial") y la estructura "no se trata de X, se trata de Y".
  - **Afirmaciones sin respaldo:** quité el "87%" y lo de "desaparecerán en dos años", porque no citaban ninguna fuente.
  - **Promesas:** quité "te garantizo que tus resultados se van a disparar" y puse un aviso honesto: "puede que a ti no te dé lo mismo".
  - **Llamadas a la acción:** dejé solo una, la de comentar "IA" para recibir la guía. Quité las de seguir y compartir.
  - **Claridad (3 → 4):** el post ahora explica qué tarea, con qué herramienta y qué resultado.
- **Pendiente:** nada en la rúbrica. Aun así, el evaluador avisa de que el gancho y la claridad dependen de que rellenes los huecos con datos reales.
- **Para rellenar:** la tarea, las horas de antes y de después, la herramienta, qué hace el equipo con el tiempo que ha ganado, dónde funcionó la IA y dónde no. Cambia también "De momento no ha pasado" si no es verdad en tu caso.

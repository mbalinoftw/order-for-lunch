export function getOrderPhrase(): string {
    return ORDER_PHRASES[Math.floor(Math.random() * ORDER_PHRASES.length)]
}

export function getOptOutPhrase(): string {
    return OPT_OUT_PHRASES[Math.floor(Math.random() * OPT_OUT_PHRASES.length)]
}

export const OPT_OUT_PHRASES = [
    "*Ok, cortate solo.* Anotado: esta semana comés air fryer y arrepentimiento. 🫡",
    "*Perfecto.* El equipo sigue comiendo y vos seguís existiendo sin pedido. Win-win, supongo.",
    "*Listo, te sacamos del radar.* Que disfrutes tu almuerzo de \"después veo qué como\".",
    "*Entendido.* No te vamos a insistir… por ahora. :eyes:",
    "*Anotado con amor y cero juicio.* (Mentira, un poquito de juicio sí.) La próxima semana será. :wave:",
    "*Cancelado.* People ya anotó que hoy no participás del team building gastronómico. 🫡",
    "*Recibido.* No pedís almuerzo pero sí tenés 47 encuestas de clima pendientes. Prioridades.",
    "*Ok.* Te bajaste del pedido. Tu one-on-one de \"¿cómo venís con la alimentación?\" queda para el Q5.",
    "*Entendido.* Feature descartada: \"Almuerzo v1\". Queda en backlog eterno junto con tus tickets. :ghost:",
    "*Perfecto.* Producto priorizó otras cosas y vos priorizaste no comer. Alineación total.",
    "*Listo.* Tu user story \"Pedir sanguche\" pasó a estado Won't Fix. Sin drama.",
    "*Anotado.* Tu deploy de almuerzo falló en prod. Rollback a hambre local completado. :rotating_light:",
    "*Ok, cortate solo.* El resto mergea pedidos a main; vos te quedás en una branch sin comida.",
    "*Recibido.* Error 404: almuerzo not found. El equipo sigue en uptime; vos en downtime.",
    "*Entendido.* No te molestamos más. Igual el daily de mañana sigue siendo a las 9, obvio. :eyes:",
]

export const ORDER_PHRASES = [
    "Pedido confirmado. Tu nutricionista fue notificada.",
    "Listo, ya le avisamos a tu vieja que no vas a almorzar sano.",
    "Excelente elección. Dijo nadie nunca.",
    "Tu pedido está en camino. Tu dignidad, no.",
    "Confirmado. Este pedido será usado en tu contra.",
    "Gracias por tu pedido. Se nota que hoy no te importa nada.",
    "Pedido registrado. Tu cardiólogo también fue notificado.",
    "Ok, pero después no llores en la balanza.",
    "Listo. Ese pedido es tan triste como tu LinkedIn.",
    "Anotado. Le avisamos a People que hoy no vas a producir nada después del almuerzo.",
    "Tu pedido ya se está preparando. Ojalá tus decisiones laborales sean mejores que esta.",
    "Confirmado. Vemos que estás pasando por un momento difícil.",
    "Pedido recibido. No te juzgamos. Mentira, sí.",
    "Listo. ¿Querés que te agendemos una siesta también?",
    "Confirmado. Tu ex tomaba mejores decisiones.",
    "Recibido. Esperamos que al menos el laburo te esté yendo bien.",
    "Anotado. El delivery llega antes que tu ascenso.",
    "Pedido confirmado. Tu sueldo lloró un poquito.",
    "OK. Le avisamos al equipo que hoy estás inestable emocionalmente.",
    "Gracias por tu pedido. Fue la peor elección del menú, pero bueno, es tu vida.",
  ]
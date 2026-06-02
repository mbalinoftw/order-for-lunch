export function getOrderPhrase(): string {
    return ORDER_PHRASES[Math.floor(Math.random() * ORDER_PHRASES.length)]
}

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
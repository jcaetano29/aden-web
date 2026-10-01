# Cooperación de party

Autorizado por el usuario: implementar la propuesta de complementariedad de las cinco clases, encuentros cooperativos y recompensas justas, conservando juego individual. Se trabaja sobre el checkout actual para preservar las mejoras locales de atributos/equipo; no se publicará ni modificará producción.

## Combate

Ampliar las habilidades existentes y mantener sus seis teclas. Caballero: Golpe de Escudo provoca en PvE y Guardia protege además al compañero seleccionado. Mago: Cura Arcana puede curar un compañero de party a 10 m, conservando autocura sin selección. Bárbaro: Furia conserva su bonus y da +15% ataque a compañeros próximos durante 6 s, sin acumular varias auras. Pícaro: Puñalada expone 20% de defensa durante 5 s y Paso Sombrío interrumpe; los jefes tienen recuperación entre controles. Explorador: Tiro del Vigía marca al enemigo para que su party haga +10% de daño durante 6 s; Flecha de Zarzas controla refuerzos cercanos. Debuffs cooperativos PvE, ayudas solo entre miembros vivos de la misma party y mapa; no hay ayudas en Castillo.

Amenaza acumulada con daño efectivo, multiplicador del caballero, provocación temporal y limpieza al morir/retirarse/cambiar mapa. Selección de aliado independiente del objetivo ofensivo. Protección reduce 30% del daño PvE del aliado durante 6 s mientras el protector vive, sigue en la party y está a 12 m. Curas contabilizan vida realmente recuperada; apoyo por prevención, daño adicional e interrupciones válidas. Venenos independientes por atacante, sin reiniciar el progreso de los demás.

## Recompensas

Party con modos de botín libre o por turnos, líder elige y todos ven el modo. Predeterminado por turnos para nuevas parties; reserva de 30 s para un destinatario elegible y distribución equilibrada, sin cambiar drops manuales ni reservas de invasiones. Bonus moderado de EXP total: +10% por compañero elegible, máximo +30%, sin duplicar la EXP pública de Cripta. Invasiones agrupan por clan, o party si no hay clan, o jugador individual. Apoyo efectivo sobre participantes del encuentro suma participación con límites y sin premiar autocuras/overheal/acciones fuera del combate. La tabla pública debe describir contribución, no solo daño.

## Encuentros y UX

Reutilizar los encuentros de Vharzul (jefe, refuerzos y yunques) y añadir oleadas limitadas de guardianes al Dragón Carmesí para dar trabajo a tanque/control. Mantener campañas individuales viables. Panel de party muestra clase, selección de aliado, efectos de apoyo y modo de botín; tooltips y guía explican nuevas funciones. Estado temporal no se persiste.

## Verificación

Pruebas de red reales para selección inválida, rango, mapa, muerte, cambio de party, recursos/cooldowns, amenaza/provocación, apoyo y venenos simultáneos. Pruebas de reparto, rotación, permisos del líder y participación. Simulaciones con party real, comparación de composiciones y ejecución con/sin cooperación, tres semillas. Suite completa, TypeScript, builds y comprobación de navegador. No se presenta el simulador como sustituto de partidas humanas.

# FAP Mendoza — Plataforma de Recursos Humanos con Inteligencia Artificial

## Manual Completo de la Plataforma

---

## Que es FAP?

FAP Mendoza es una plataforma digital de recursos humanos que conecta a personas que buscan trabajo con empresas que necesitan personal. Lo que la hace diferente es que usa inteligencia artificial para:

- Leer y entender curriculos automaticamente
- Encontrar que candidato es compatible con que oferta
- Enviar comunicaciones personalizadas
- Asistir al administrador con un chat inteligente

La plataforma tiene tres tipos de usuario:
- **Candidatos**: personas buscando trabajo
- **Empleadores**: empresas publicando ofertas
- **Administrador**: quien gestiona toda la plataforma

---

## PARTE 1: EL CANDIDATO

### Como llega un candidato a la plataforma?

Hay tres caminos posibles:

**Camino 1 — Se registra desde la web**

1. El candidato entra a la pagina principal de FAP
2. Hace click en "Subir CV"
3. Sube su curriculum en PDF
4. Recibe un email con un link para confirmar su cuenta
5. Hace click en el link y listo

En ese momento, la inteligencia artificial lee el CV completo y extrae automaticamente:
- Nombre completo
- Telefono
- Email
- En que rubro trabaja (gastronomia, seguridad, administracion, IT, etc.)
- Sus habilidades principales
- Anos de experiencia
- Una descripcion profesional resumida

Se le crea una cuenta con usuario y contrasena, y se le envia por email.

**Camino 2 — Manda su CV por email**

Muchas personas simplemente mandan su CV por correo electronico a las cuentas de FAP. La plataforma tiene conectadas dos bandejas de entrada (una cuenta de Gmail y una de Google Workspace).

El administrador escanea las bandejas desde el panel y el sistema automaticamente:
- Detecta que el email tiene un CV adjunto
- Extrae todos los datos con inteligencia artificial
- Crea la cuenta del candidato
- Le envia un email con sus credenciales de acceso
- Clasifica el email en una carpeta de Gmail (CVs, Propuestas, Consultas, etc.)

**Camino 3 — El administrador sube CVs manualmente**

Desde el panel de administracion, se pueden subir uno o varios PDFs de curriculos. El sistema procesa cada uno automaticamente, crea las cuentas y envia las credenciales.

### Que puede hacer un candidato una vez registrado?

- **Ver ofertas de trabajo**: puede filtrar por rubro, por fecha (ultimas 24 horas, ultima semana, ultimo mes), y por tipo (destacadas o gratuitas). Las ofertas destacadas aparecen siempre primero con una estrella
- **Postularse a una oferta**: con un click en "Postularme"
- **Cancelar una postulacion**: tiene 5 minutos para arrepentirse
- **Editar su perfil**: cambiar nombre, telefono, descripcion
- **Subir documentos adicionales**: certificados, titulos, referencias (hasta 5 archivos)
- **Cambiar su contrasena**
- **Eliminar su cuenta** si lo desea

### Que pasa cuando un candidato se postula?

1. Hace click en "Postularme" en una oferta
2. Inmediatamente recibe un email: "Tu postulacion se enviara en 5 minutos" — esto le da tiempo para cancelar si se equivoco
3. Despues de 5 minutos, ocurren dos cosas:
   - El empleador recibe un email con los datos del candidato (nombre, email, link a su CV)
   - El candidato recibe un email de confirmacion: "Tu postulacion fue enviada exitosamente"

---

## PARTE 2: EL EMPLEADOR

### Como publica una oferta?

1. Se registra o inicia sesion en la plataforma
2. Desde su panel, hace click en "Publicar Oferta"
3. Completa los datos: titulo del puesto, descripcion, requisitos, fecha de expiracion
4. Elige el tipo de publicacion:

**Publicacion Gratuita:**
- La oferta aparece en el listado general
- Los candidatos la ven y pueden postularse
- La inteligencia artificial igual calcula que candidatos son compatibles (esta informacion queda disponible para el administrador)
- No se envian emails automaticos a los candidatos

**Publicacion Destacada ($15.000):**
- La oferta aparece primero en el listado con una estrella dorada
- Ademas, el sistema automaticamente envia un email personalizado a cada candidato que la IA detecta como compatible, invitandolo a postularse
- Es decir: la empresa paga para que FAP busque candidatos activamente por ella

El pago se procesa a traves de MercadoPago. Despues de pagar, todo se activa automaticamente.

### Panel del empleador

Cuando un empleador entra a su panel, ve:

**Metricas:**
- Cuantas ofertas activas tiene
- Cuantas postulaciones recibio en total
- Cuantas ofertas destacadas tiene

**Acciones disponibles:**
- Publicar nueva oferta
- Ver sus ofertas existentes
- Actualizar su perfil
- Solicitar busqueda de personal (servicio pago)

---

## PARTE 3: EL MATCHING (como la IA conecta candidatos con ofertas)

### Como funciona?

Cada vez que se sube un CV o se crea una oferta, la inteligencia artificial genera una representacion numerica del contenido (como una "huella digital" del texto). Despues compara estas huellas entre si para encontrar similitudes.

**Ejemplo practico:**
- Un candidato que trabajo 5 anos como mozo en distintos restaurantes tiene una huella digital que "pesa" mucho hacia gastronomia
- Una oferta de "Mozo/a para restaurante" tiene una huella similar
- La IA calcula que hay un 87% de compatibilidad — es un excelente match

**Reglas del matching:**
- Si el rubro del candidato coincide exactamente con el de la oferta, se le suma un bonus de 5% al score
- Solo se consideran matches con 75% o mas de compatibilidad
- Solo se notifican por email matches de 78% o mas (en ofertas pagas)

**Cuando se ejecuta:**
- Cuando se crea una oferta nueva: busca candidatos compatibles entre todos los registrados
- Cuando se registra un candidato nuevo: busca ofertas compatibles entre todas las vigentes

**Diferencia segun tipo de oferta:**

| Concepto | Oferta Gratuita | Oferta Paga |
|----------|----------------|-------------|
| Se calcula el matching | Si | Si |
| Se envian emails a candidatos | No | Si, automaticamente |
| El admin ve los matches | Si | Si |
| El admin puede enviar emails manualmente | Si | Ya se enviaron solos |

---

## PARTE 4: EL PANEL DE ADMINISTRACION

El panel de administracion es el centro de control de toda la plataforma. Se accede con una cuenta especial de administrador. Tiene las siguientes secciones:

### Dashboard
Muestra estadisticas generales en tiempo real: cantidad de usuarios registrados, ofertas activas, y matches realizados. Tiene botones de acceso rapido a las funciones mas usadas.

### Editar Base de Datos
Una tabla con todos los usuarios del sistema. Se puede:
- Buscar por nombre, email o telefono
- Ver y editar los datos de cada usuario (nombre, telefono, descripcion, rubro)
- Subir o eliminar archivos del usuario
- Eliminar usuarios
- Ver el rubro de cada persona con un indicador visual de color

### Agregar CV
Subir uno o varios CVs en PDF. El sistema procesa cada uno automaticamente: extrae datos con IA, crea la cuenta, y envia credenciales por email.

### Agregar Oferta
Crear ofertas de trabajo como administrador, con control total sobre todos los campos.

### Mis Ofertas
Ver, editar y eliminar todas las ofertas. Las ofertas pagas se marcan con una estrella. Se puede cambiar el tipo (automatica/manual), el rubro, y los datos de contacto.

### Matchings
Esta es una de las secciones mas importantes. Muestra todos los matches entre candidatos y ofertas. El administrador puede:

- **Filtrar** por rubro, por oferta especifica, o ver solo los matches pendientes (sin notificar)
- **Ver un banner** con las ofertas que tienen candidatos compatibles sin notificar. Por ejemplo: "Guardia de seguridad (8 candidatos)" — haciendo click se puede enviar el email a los 8 candidatos de una vez
- **Enviar emails individuales** a candidatos especificos
- **Ver el perfil** de cualquier candidato directamente desde la tabla
- **Distinguir** entre ofertas gratuitas y pagas (las pagas tienen una estrella)

**Ejemplo de uso:**
1. Un empleador publica una oferta gratuita de "Recepcionista"
2. El matching detecta 15 candidatos compatibles
3. El admin entra a Matchings y ve "Recepcionista (15 candidatos)"
4. Decide enviar emails solo a los 5 mejores → click en cada uno
5. O decide enviar a todos → click en el chip de la oferta → confirmar

### Propuestas
Ver el estado de todas las postulaciones: pendientes, enviadas, canceladas, con error. Permite reenviar propuestas si hubo algun problema.

### Plantillas
Gestionar los templates de email que usa el sistema. Se pueden crear templates para: notificaciones de match, propuestas a empleadores, confirmaciones, advertencias de cancelacion.

### Base de E-mails
Una base de contactos separada para acciones de mailing. Se pueden importar contactos desde archivos PDF, DOCX o TXT.

### Bandejas de Entrada
Aqui se conectan las cuentas de correo de FAP:

1. Se agrega una cuenta ingresando: nombre, email, App Password (se genera desde Google), y el servidor IMAP
2. Se puede repetir para la segunda cuenta
3. Con el boton "Escanear" se procesan todos los emails nuevos
4. Los CVs se convierten en cuentas automaticamente
5. Los emails se clasifican en carpetas: CVs, Propuestas, Consultas, Ofertas, Spam
6. Se puede escanear todas las cuentas a la vez

### Mailing Segmentado
Enviar emails personalizados a grupos especificos de candidatos:

1. Elegir un rubro (por ejemplo: "Gastronomia") o buscar por palabra clave
2. Ver cuantos destinatarios hay y quienes son (tabla con nombres y emails)
3. Escribir el asunto y el cuerpo del email (se puede usar {nombre} para personalizar automaticamente)
4. Confirmar y enviar

**Ejemplo:** "Quiero avisarles a todos los candidatos de gastronomia que hay una nueva oferta" → filtro por rubro Gastronomia → veo que hay 45 candidatos → escribo el email → envio.

### Screenshot a Oferta
Esta funcion permite convertir una imagen en una oferta de trabajo publicada:

1. Si el administrador ve una oferta de trabajo en una historia de Instagram, en un grupo de WhatsApp, o en cualquier otro lado, saca un screenshot
2. Lo sube a la plataforma
3. La inteligencia artificial lee la imagen y extrae: titulo del puesto, descripcion, requisitos, rubro, datos de contacto, ubicacion, sueldo (si aparece)
4. El administrador revisa los datos, puede corregir lo que quiera
5. Hace click en "Publicar" y la oferta queda publicada en la plataforma

### Solicitudes de Busqueda
Cuando una empresa contrata el servicio de busqueda de personal ($50.000), la solicitud aparece aqui:

- Se ve la empresa, que puesto buscan, cuantas personas necesitan, la urgencia
- El boton "Buscar" abre el Asistente IA con la consulta ya lista
- Despues de encontrar candidatos, se les puede enviar email desde Mailing
- Se marca la solicitud como completada

### Asistente FAP (Chat con IA)
Un chat inteligente donde el administrador puede hacer consultas en lenguaje natural:

**Ejemplos de lo que se puede pedir:**
- "Buscame candidatos de gastronomia" → lista candidatos con nombre, email, rubro, telefono
- "Necesito un guardia de seguridad en Godoy Cruz" → busca candidatos compatibles
- "Cuantos candidatos tenemos en total?" → muestra estadisticas
- "Cuantos candidatos hay por rubro?" → muestra el desglose
- "Armame un grupo con todos los de IT para mandarles un email" → prepara la lista de destinatarios
- "Que ofertas tenemos activas?" → lista las ofertas vigentes
- "Que candidatos matchean con la oferta de mozo?" → muestra los matches de esa oferta

El asistente tiene acceso directo a la base de datos y puede ejecutar busquedas, calcular estadisticas, y preparar envios de email. Siempre pide confirmacion antes de enviar emails.

### Configuraciones
Ajustes generales del sistema.

### Notificaciones (campana)
Arriba a la derecha del panel hay una campana que muestra notificaciones en tiempo real:
- Nuevas solicitudes de busqueda pagadas
- Nuevos candidatos registrados
- Matches con alta compatibilidad (85% o mas)

Se actualiza automaticamente cada 60 segundos. Las notificaciones se pueden marcar como leidas.

---

## PARTE 5: LOS EMAILS QUE ENVIA LA PLATAFORMA

Todos los emails se envian con un diseno profesional usando los colores de la marca FAP (naranja, verde oscuro, crema):

| Email | Cuando se envia | A quien |
|-------|----------------|---------|
| Confirmacion de cuenta | Cuando alguien sube su CV | Al candidato |
| Credenciales de acceso | Cuando se crea la cuenta (despues de confirmar) | Al candidato |
| Match encontrado | Cuando hay una oferta paga compatible | Al candidato |
| Postulacion en espera | Cuando el candidato se postula (5 min para cancelar) | Al candidato |
| Postulacion enviada | Despues de los 5 minutos | Al candidato |
| Nueva postulacion | Despues de los 5 minutos | Al empleador |
| Alerta del sistema | Cuando hay errores criticos | Al administrador |

---

## PARTE 6: COMO SE GENERA INGRESO

### Canal 1 — Servicio de Busqueda de Personal ($50.000 por pedido)

En la pagina principal hay un boton "Necesito Personal" (tambien en el footer y en el panel del empleador). Al hacer click, la empresa llega a una pagina donde:

1. Completa un formulario: que puesto necesita, cuantas personas, requisitos, urgencia (urgente/normal/flexible), ubicacion
2. Paga $50.000 con MercadoPago
3. El administrador recibe una notificacion y un email
4. Abre el Asistente IA y le pide buscar candidatos con esas caracteristicas
5. Usa el Mailing para contactar a los mejores candidatos
6. Le pasa los candidatos interesados a la empresa
7. Marca la solicitud como completada

**Costo operativo: casi cero. Tiempo: 10-15 minutos. Todo el trabajo pesado lo hace la IA.**

### Canal 2 — Ofertas Destacadas ($15.000 por oferta)

Cuando un empleador publica una oferta, puede elegir hacerla "Destacada":

1. Paga $15.000 con MercadoPago
2. Su oferta aparece primero en el listado con una estrella dorada
3. El sistema automaticamente envia emails a todos los candidatos compatibles invitandolos a postularse

**Es completamente automatico. La empresa paga, y FAP se encarga de todo.**

---

## PARTE 7: PERFIL PUBLICO DE CANDIDATO

Cada candidato tiene una pagina publica accesible en la direccion /candidato/{id}. Esta pagina muestra:
- Foto de perfil
- Nombre completo
- Rubro profesional
- Descripcion profesional
- Telefono de contacto
- Boton para ver su CV

Esta pagina no requiere estar logueado. Es util para cuando el administrador quiere compartir el perfil de un candidato con una empresa, o para que los empleadores revisen a los postulantes.

---

## PARTE 8: DOCUMENTACION TECNICA (para desarrolladores)

La API del backend esta completamente documentada y accesible en:
- Documentacion interactiva: api.fapmendoza.online/docs
- Documentacion alternativa: api.fapmendoza.online/redoc

La API incluye modelos de datos tipados, descripciones de cada endpoint, y la posibilidad de probar las llamadas directamente desde el navegador.

---

## RESUMEN DE FUNCIONALIDADES

| Funcion | Descripcion |
|---------|-------------|
| Registro de candidatos | Automatico desde CV (web, email, o manual) |
| Extraccion de datos de CV | IA lee nombre, tel, email, rubro, habilidades, experiencia |
| Clasificacion por rubro | Automatica: Gastronomia, Seguridad, IT, Administracion, etc. |
| Matching inteligente | IA compara candidatos con ofertas y calcula compatibilidad |
| Ofertas gratuitas | Aparecen en listado, candidatos se postulan |
| Ofertas destacadas | Aparecen primero + emails automaticos a candidatos compatibles |
| Postulacion | Click para postularse, 5 min para cancelar, emails al empleador |
| Escaneo de bandejas | Lee emails de 2 cuentas, clasifica, procesa CVs |
| Mailing segmentado | Enviar emails a grupos filtrados por rubro o palabra clave |
| Screenshot a oferta | Sube foto de oferta → IA extrae datos → publica |
| Asistente IA | Chat donde el admin pide busquedas, stats, y envios |
| Servicio de busqueda | Empresas pagan $50.000 por busqueda de candidatos |
| Ofertas destacadas | Empresas pagan $15.000 por publicacion premium |
| Notificaciones | Campana con alertas en tiempo real |
| Perfil publico | Pagina publica de cada candidato |
| Panel admin completo | 16 secciones para gestionar todo |
| Emails profesionales | Diseño con colores de marca, personalizados |
| API documentada | Documentacion interactiva en /docs |

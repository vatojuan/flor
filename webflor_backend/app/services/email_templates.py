"""
Professional HTML email templates for FAP Mendoza.

Uses the brand color palette:
- Primary: #D96236 (burnt orange)
- Secondary: #103B40 (dark teal)
- Background: #F2E6CE (cream)
- Text: #3E2723 (dark brown)
"""


def _base_template(content: str, preheader: str = "") -> str:
    """Wrap content in the base email layout with FAP branding."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>FAP Mendoza</title>
<style>
  body {{ margin: 0; padding: 0; background-color: #F2E6CE; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }}
  .preheader {{ display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #F2E6CE; }}
  .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }}
  .header {{ background: linear-gradient(135deg, #103B40 0%, #1a5c63 100%); padding: 32px 40px; text-align: center; }}
  .header h1 {{ color: #ffffff; font-size: 28px; margin: 0; font-weight: 700; letter-spacing: 1px; }}
  .header .subtitle {{ color: #D96236; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; }}
  .body {{ padding: 40px; color: #3E2723; font-size: 15px; line-height: 1.7; }}
  .body h2 {{ color: #103B40; font-size: 20px; margin: 0 0 16px 0; }}
  .body p {{ margin: 0 0 16px 0; }}
  .btn {{ display: inline-block; background: linear-gradient(135deg, #D96236 0%, #e07a50 100%); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 0; }}
  .info-box {{ background: #f8f4ef; border-left: 4px solid #D96236; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }}
  .info-box strong {{ color: #103B40; }}
  .badge {{ display: inline-block; background: #D96236; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }}
  .footer {{ background: #103B40; padding: 24px 40px; text-align: center; }}
  .footer p {{ color: #a0b5b8; font-size: 12px; margin: 4px 0; }}
  .footer a {{ color: #D96236; text-decoration: none; }}
  .divider {{ height: 1px; background: linear-gradient(90deg, transparent, #D96236, transparent); margin: 24px 0; }}
</style>
</head>
<body>
<span class="preheader">{preheader}</span>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F2E6CE; padding: 40px 20px;">
<tr><td align="center">
<div class="container">
  <div class="header">
    <h1>FAP</h1>
    <div class="subtitle">Recursos Humanos &bull; Mendoza</div>
  </div>
  <div class="body">
    {content}
  </div>
  <div class="footer">
    <p><a href="https://fapmendoza.online">fapmendoza.online</a></p>
    <p>&copy; FAP Mendoza &mdash; Todos los derechos reservados</p>
  </div>
</div>
</td></tr>
</table>
</body>
</html>"""


def confirmation_email(confirm_url: str) -> tuple[str, str]:
    """Returns (subject, html_body) for account confirmation."""
    subject = "Activa tu cuenta en FAP Mendoza"
    content = f"""
    <h2>Confirma tu email</h2>
    <p>Gracias por registrarte en FAP Mendoza. Para completar tu registro y activar tu cuenta, haz clic en el siguiente boton:</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="{confirm_url}" class="btn">Activar mi cuenta</a>
    </p>
    <p style="font-size: 13px; color: #888;">Si no solicitaste este registro, puedes ignorar este mensaje.</p>
    """
    return subject, _base_template(content, "Confirma tu email para activar tu cuenta")


def credentials_email(name: str, email: str, password: str) -> tuple[str, str]:
    """Returns (subject, html_body) for welcome with credentials."""
    subject = "Bienvenido a FAP Mendoza — Tus credenciales de acceso"
    content = f"""
    <h2>Bienvenido, {name}</h2>
    <p>Tu cuenta ha sido creada y activada exitosamente. Ya podes iniciar sesion con los siguientes datos:</p>
    <div class="info-box">
      <strong>Usuario:</strong> {email}<br>
      <strong>Contrasena temporal:</strong> {password}
    </div>
    <p>Te recomendamos cambiar tu contrasena despues de iniciar sesion por primera vez.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://fapmendoza.online/login" class="btn">Iniciar sesion</a>
    </p>
    """
    return subject, _base_template(content, f"Hola {name}, tu cuenta esta lista")


def match_notification(context: dict) -> tuple[str, str]:
    """Returns (subject, html_body) for job match notification."""
    name = context.get("applicant_name", "")
    job_title = context.get("job_title", "una oferta")
    score = context.get("score", "N/A")
    apply_link = context.get("apply_link", "#")

    subject = f"{name}, encontramos una oportunidad para ti"
    content = f"""
    <h2>Nueva oportunidad laboral</h2>
    <p>Hola {name}, basado en tu perfil encontramos una oferta con alta compatibilidad:</p>
    <div class="info-box">
      <strong>{job_title}</strong><br>
      Compatibilidad: <span class="badge">{score}</span>
    </div>
    <p>Creemos que es una excelente oportunidad para tu carrera. Si te interesa, postulate directamente:</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="{apply_link}" class="btn">Ver oferta y postularme</a>
    </p>
    <p style="font-size: 13px; color: #888;">Este enlace es unico para vos y estara activo durante 30 dias.</p>
    """
    return subject, _base_template(content, f"Compatibilidad {score} con {job_title}")


def proposal_to_employer(context: dict) -> tuple[str, str]:
    """Returns (subject, html_body) for sending candidate application to employer."""
    job_title = context.get("job_title", "")
    applicant_name = context.get("applicant_name", "Un candidato")
    applicant_email = context.get("applicant_email", "")
    employer_name = context.get("employer_name", "equipo de seleccion")
    cv_url = context.get("cv_url", "")

    subject = f"Nueva postulacion para \"{job_title}\""
    content = f"""
    <h2>Nueva postulacion recibida</h2>
    <p>Hola {employer_name}, recibiste una nueva postulacion para la oferta <strong>{job_title}</strong>.</p>
    <div class="info-box">
      <strong>Candidato:</strong> {applicant_name}<br>
      <strong>Email:</strong> {applicant_email}
    </div>
    {"<p><a href='" + cv_url + "' class='btn' style='font-size: 14px; padding: 10px 24px;'>Ver CV del candidato</a></p>" if cv_url else ""}
    <div class="divider"></div>
    <p>Te recomendamos contactar al candidato a la brevedad para continuar con el proceso de seleccion.</p>
    """
    return subject, _base_template(content, f"Nuevo candidato para {job_title}")


def application_confirmation(context: dict) -> tuple[str, str]:
    """Returns (subject, html_body) for confirming application was sent."""
    name = context.get("applicant_name", "")
    job_title = context.get("job_title", "")

    subject = f"Tu postulacion para \"{job_title}\" fue enviada"
    content = f"""
    <h2>Postulacion enviada con exito</h2>
    <p>Excelente {name}, tu postulacion para <strong>{job_title}</strong> ha sido registrada y enviada correctamente.</p>
    <div class="info-box">
      El equipo de la empresa recibio tu perfil y lo revisara a la brevedad. Si tu perfil avanza, se pondran en contacto directamente.
    </div>
    <p>Te deseamos el mayor de los exitos.</p>
    """
    return subject, _base_template(content, f"Tu postulacion para {job_title} fue enviada")


def cancellation_warning(context: dict) -> tuple[str, str]:
    """Returns (subject, html_body) for 5-minute warning before send."""
    name = context.get("applicant_name", "")
    job_title = context.get("job_title", "")

    subject = f"Tu postulacion para \"{job_title}\" se enviara en 5 minutos"
    content = f"""
    <h2>Postulacion en espera</h2>
    <p>Hola {name}, recibimos tu interes en <strong>{job_title}</strong>. Tu postulacion sera enviada a la empresa en <strong>5 minutos</strong>.</p>
    <div class="info-box">
      Si te postulaste por error o cambiaste de opinion, este es el momento para cancelarla desde tu panel de usuario.
    </div>
    <p>Pasado ese tiempo, la postulacion sera definitiva.</p>
    """
    return subject, _base_template(content, f"5 minutos para cancelar tu postulacion a {job_title}")

<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Recoger los datos del formulario
    $name = $_POST['name'];
    $email = $_POST['email'];
    $message = $_POST['message'];
    
    // Dirección de correo donde quieres recibir los mensajes
    $to = "retroar82@gmail.com";
    
    // Asunto del correo
    $subject = "Mensaje de contacto de RETROART";
    
    // Contenido del mensaje
    $email_content = "Nombre: $name\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Mensaje:\n$message\n";
    
    // Cabeceras del correo
    $headers = "From: $email\n";
    $headers .= "Reply-To: $email";
    
    // Envío del correo
    mail($to, $subject, $email_content, $headers);
    
    // Redirigir a una página de confirmación
    header('Location: contact_confirmation.html');
    exit;
}
?>
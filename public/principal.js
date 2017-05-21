$(function () {

    var socket = io();
    var numeroUsuarios;
    $.get('/consultarUsuarios', function (response) {
        $('.informacion-chat').text("Actualmente hay " + response.length + " personas en la sala de chat");
        numeroUsuarios = response.length; //Actualiza el número de usuarios
    });
    $('#unirse-chat').click(function () {
        var nombreUsuario = $.trim($('#nombreUsuario').val());
        $.ajax({
            url: '/unirse',
            type: 'POST',
            data: {
                nombreUsuario: nombreUsuario
            },
            success: function (response) {
                if (response.estado == 'OK') { //El usuario aún no existe
                    socket.emit('actualizarNumeroUsuarios', {
                        'accion': 'incrementar'
                    });
                    $('.chat').show();
                    $('#abandonar-chat').data('nombreUsuario', nombreUsuario);
                    $('#enviar-mensaje').data('nombreUsuario', nombreUsuario);
                    $.get('/consultarMensajes', function (response) {
                        if (response.length > 0) {
                            var numeroMensajes = response.length;
                            var html = '';
                            for (var x = 0; x < numeroMensajes; x++) {
                                html += "<div class='msg'><div class='usuario'>" + response[x]['remitente'] + "</div>"+ "(" +response[x]['hora']+ "): "  + response[x]['mensaje'] + "</div>";
                            }
                            $('.mensajes').html(html);
                        }
                    });
                    $('.unirse-chat').hide(); //Oculta el contenedor al unirse a la sala de chat
                } else if (response.estado == 'FALLO') { //El nombre de usuario ya existe
                    alert("Lo siento pero el nombre de usuario ya existe, por favor escoja otro");
                    $('#nombreUsuario').val('').focus();
                }
            }
        });
    });
    $('#abandonar-chat').click(function () {
        var nombreUsuario = $(this).data('nombreUsuario');
		var d= new Date();
		var hora= d.getDate() + "/" + (d.getMonth() +1) + "/" + d.getFullYear()+ ', '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
        $.ajax({
            url: '/abandonar',
            type: 'POST',
            dataType: 'json',
            data: {
                nombreUsuario: nombreUsuario,
				hora: hora
            },
            success: function (response) {
                if (response.estado == 'OK') {
                    socket.emit('mensaje', {
                        'nombreUsuario': nombreUsuario,
                        'mensaje': nombreUsuario + " ha abandonado la sala.."
	
                    });
                    socket.emit('actualizarNumeroUsuarios', {
                        'accion': 'decrementar'
                    });
                    $('.chat').hide();
                    $('.unirse-chat').show();
                    $('#nombreUsuario').val('');
                    alert('Has abandonado la sala satisfactoriamente');
                }
            }
        });
    });
    $('#enviar-mensaje').click(function () {
        var nombreUsuario = $(this).data('nombreUsuario');
        var mensaje = $.trim($('#mensaje').val());
		var d= new Date();
		var hora= d.getDate() + "/" + (d.getMonth() +1) + "/" + d.getFullYear()+ ', '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
        $.ajax({
            url: '/enviarMensaje',
            type: 'POST',
            dataType: 'json',
            data: {
                'nombreUsuario': nombreUsuario,
                'mensaje': mensaje,
				'hora': hora
            },
            success: function (response) {
                if (response.estado == 'OK') {
                    socket.emit('mensaje', {
                        'nombreUsuario': nombreUsuario,
                        'mensaje': mensaje,
						'hora': hora
                    });
                    $('#mensaje').val('');
                }
            }
        });
    });
    socket.on('enviar', function (data) {
        var nombreUsuario = data.nombreUsuario;
        var mensaje = data.mensaje;
		var hora = data.hora;
        var html = "<div class='msg'><div class='usuario'>" + nombreUsuario +"</div><div class='txt'>" +"(" + hora + "): " +mensaje + "</div></div>";
        $('.mensajes').append(html);
    });
    socket.on('contarUsuarios', function (data) {
        if (data.accion == 'incrementar') {
            numeroUsuarios++;
        } else {
            numeroUsuarios--;
        }
        $('.informacion-chat').text("Actualmente hay " + numeroUsuarios + " personas en la sala de chat");
    });
});
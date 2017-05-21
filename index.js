//Inicializamos los módulos que necesitamos
var express = require('express');
var bodyParser = require('body-parser');
var aplicacion = express();
var http = require('http').Server(aplicacion);
var io = require('socket.io')(http);

var fs = require('fs');
var credenciales = '';

var redis = require('redis');
var cliente = '';


// Empezamos a leer las credenciales mediante un JSON
fs.readFile('credenciales.json', 'utf-8', function (err, data) {
    if (err) throw err;
    credenciales = JSON.parse(data);
    cliente = redis.createClient('redis://' + credenciales.usuario + ':' + credenciales.contraseña + '@' + credenciales.servidor + ':' + credenciales.puerto);

    // El cliente de Redis se encontrará preparado
    cliente.once('ready', function () {
		console.log('preparado');
        // Limpiamos la base de data (se puede dejar comentado)
        cliente.flushdb();

        // Populamos los usuarios
        cliente.get('usuariosChat', function (err, reply) {
            if (reply) {
                usuarios = JSON.parse(reply);
            }
        });

        // Populamos los mensajes
        cliente.get('mensajesChat', function (err, reply) {
            if (reply) {
                mensajes = JSON.parse(reply);
            }
        });
    });
});

// Almacena los usuarios del chat
var usuarios = [];

// Almacena los mensajes del chat, junto a su usuario
var mensajes = [];


var puerto = process.env.PORT || 8080;

// Arrancamos el servidor
http.listen(puerto, function () {
    console.log('El servidor arrancó. Transmitiendo por *:' + puerto);
});



// Usamos Express Middleware
//Declaramos la ruta donde se encontrarán nuestros archivos CSS y JavaScript
aplicacion.use(express.static('public'));
//Nos devolverá el Middleware resultando en un nuevo cuerpo con pares clave-valor de cualquier tipo( por extended:true)
aplicacion.use(bodyParser.urlencoded({
    extended: true
}));

// Generamos el archivo html principal
aplicacion.get('/', function (req, res) {
    res.sendFile('index.html', {
        root: __dirname
    });
});

function isEmpty(str) {
    return (!str || 0 === str.length);
}

function isBlank(str) {
    return (!str || /^\s*$/.test(str));
}


// Unión - Se usará cuando un nuevo usuario entra en la aplicación e intenta unirse a la sala de chat
aplicacion.post('/unirse', function (req, res) {
    var nombreUsuario = req.body.nombreUsuario;
    if (usuarios.indexOf(nombreUsuario) === -1 && !isEmpty(nombreUsuario) && !isBlank(nombreUsuario)) {
        usuarios.push(nombreUsuario);
        cliente.set('usuariosChat', JSON.stringify(usuarios));
        res.send({
            'usuarios': usuarios,
            'estado': 'OK'
        });
    } else if(isEmpty(nombreUsuario) || isBlank(nombreUsuario)){
		res.send({
            'estado': 'INVALIDO'
        });
	}
	else {
        res.send({
            'estado': 'FALLO'
        });
    }
});

// Abandonar - Se usará cuando un usuario deja la sala de chat
aplicacion.post('/abandonar', function (req, res) {
    var nombreUsuario = req.body.nombreUsuario;
    usuarios.splice(usuarios.indexOf(nombreUsuario), 1);
    cliente.set('usuariosChat', JSON.stringify(usuarios));
    res.send({
        'estado': 'OK'
    });
});

// Enviar mensaje - Se usará cuando un usuario envíe un mensaje, además lo guardará en la base de data de Redis
aplicacion.post('/enviarMensaje', function (req, res) {
    var nombreUsuario = req.body.nombreUsuario;
    var mensaje = req.body.mensaje;
	var d= new Date();
	var hora= d.getDate() + "/" + (d.getMonth() +1) + "/" + d.getFullYear()+ ', '+d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
    if(!isEmpty(mensaje) && !isBlank(mensaje)){
		mensajes.push({
			'remitente': nombreUsuario,
			'mensaje': mensaje,
			'hora': hora
		});
		cliente.set('mensajesChat', JSON.stringify(mensajes));
		res.send({
			'estado': 'OK'
		});
		}
	else{
		res.send({
			'estado': 'INVALIDO'
		});
	}
});

// Consultar mensajes - Devolverá todos los mensajes que se han enviado
aplicacion.get('/consultarMensajes', function (req,res) {
    res.send(mensajes);
});

// Consultar usuarios - Devolverá todos los usuarios que han entrado en la sala de chat
aplicacion.get('/consultarUsuarios', function (req,res) {
    res.send(usuarios);
});

// Conexión del Socket
// Manipulando la interfaz de usuario
io.on('connection', function (socket) {

    // Lanza el evento de actualizar la lista de mensajes
    socket.on('mensaje', function (data) {
        io.emit('enviar', data);
    });

    // Lanza el evento de contar usuarios
    socket.on('actualizarNumeroUsuarios', function (data) {
        io.emit('contarUsuarios', data);
    });

});
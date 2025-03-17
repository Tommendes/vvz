const Minio = require('minio');
const { minio } = require("../.env")

// Configuração do cliente MinIO
const minioEnv = {
    endPoint: minio.endPoint, // ou a URL do seu MinIO
    port: minio.port || 443, // Porta padrão do MinIO
    useSSL: minio.useSSL || false, // Defina como true se estiver usando HTTPS
    accessKey: minio.accessKey,
    secretKey: minio.secretKey
};
const minioClient = new Minio.Client(minioEnv);

module.exports = minioClient;

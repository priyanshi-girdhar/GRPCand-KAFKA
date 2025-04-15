const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');

// Load the gRPC proto file
const PROTO_PATH = 'service.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const example = grpcObject.example;

// Kafka setup to consume messages from Service1
const kafka = new Kafka({
  clientId: 'service2-client',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'service1-group' });

// Set up gRPC server for Service2
const server = new grpc.Server();

server.addService(example.Service1Service.service, {
  getMessage: (call, callback) => {
    console.log(`Service2 received message: ${call.request.message}`);
    callback(null, { message: `Response from Service2: ${call.request.message}` });
  },
});

// Setup Kafka consumer to listen for messages from Service1
async function startKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'service2-topic' });

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received Kafka message: ${message.value.toString()}`);
    },
  });
}

// Start the gRPC server
server.bindAsync('localhost:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('Service2 gRPC server is running on port 50051');
  startKafkaConsumer();
  server.start();
});

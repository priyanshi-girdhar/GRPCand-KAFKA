const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');

// Load the gRPC proto file
const PROTO_PATH = 'service.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const example = grpcObject.example;

const app = express();
app.use(express.json());

// Set up gRPC client to connect to Service2
const client = new example.Service1Service(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Kafka setup to send messages to Service2
const kafka = new Kafka({
  clientId: 'service1-client',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();

// REST API that communicates with Service2 using gRPC
app.get('/grpc-to-service2', (req, res) => {
  const message = req.query.message || 'Hello from Service1!';

  client.getMessage({ message }, (error, response) => {
    if (error) {
      res.status(500).send(error);
    } else {
      res.json({ response: response.message });
    }
  });
});

// REST API to simulate sending a message to Service2 via Kafka
app.get('/kafka-to-service2', async (req, res) => {
  await producer.connect();
  await producer.send({
    topic: 'service2-topic',
    messages: [{ value: 'Hello from Service1 via Kafka!' }],
  });

  res.send('Message sent to Service2 via Kafka.');
});

app.listen(3000, () => {
  console.log('Service1 is running on port 3000');
});

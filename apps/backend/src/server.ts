import express, { RequestHandler } from 'express';
import {z,ZodTypeAny} from 'zod';
import { Consumer, jsonDeserializer, Producer, stringDeserializer, stringDeserializers, stringSerializers } from '@platformatic/kafka'
import { Admin } from '@platformatic/kafka'
import cors from 'cors';
import bodyParser from 'body-parser';
import { initServer } from '@ts-rest/express';
import { createExpressEndpoints } from '@ts-rest/express';
import pino from "pino-http";
const pinoLogger = pino.default()
const {logger}= pinoLogger
import {CHANNELS, Notification} from "./types.js"

import { Request, Response, NextFunction } from "express";

export function zodBodyValidation<T extends ZodTypeAny>(
  schema: T
): RequestHandler<any, any, z.infer<T>> {
  return (req: Request<any, any, z.infer<T>>, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    // overwrite req.body with the validated & typed version
    req.body = parsed.data;
    next();
  };
}


// -----------
// STATUS
// -----------


function createHealthModule(){
    const statusRouter = express.Router();

    async function checkKafkaHealth() {
    const adminHealth = new Admin({
    clientId: 'my-admin-health',
    bootstrapBrokers: ['localhost:9092']
    })
    const res = await adminHealth.listTopics()
        .then(() => adminHealth.close())
        .then(() => {
        return { status: 'ok' ,};
        })
        .catch((err) => {
        return { status: 'error', error: err.message };
        });
        
        return res
    
    }

    statusRouter.get('/health', async (req, res) => {
        const kafkaHealth = await checkKafkaHealth();
        const status = kafkaHealth.status === 'ok' ? 200 : 500;
        res.status(status).json({ kafka: kafkaHealth });
    });

    statusRouter.get('/status', (req, res) => {
        res.status(200).json({ status: 'OK'});
    });

    return {
        router: statusRouter
    }

}
// -----------
// USERS
// -----------
function createUserModule(){
    const userRouter = express.Router();

    userRouter.get('/users', (req, res) => {
        res.status(200).json({
            users:[]
        });
    });
    userRouter.post('/users', (req, res) => {
        const { id, name , email} = req.body;
        res.status(201).json({ name , email });
    });

    return {
        router: userRouter
    }

}


// -----------
// NOTIFICATIONS
// -----------

function createNotificationsModule(){
    const ACTIVE_NOTIFICATIONS_SESSIONS: Record<string, express.Response> = {}

    const notificationsProducer = new Producer({
        clientId: 'notifications-producer',
        bootstrapBrokers: ['localhost:9092'],
        serializers: stringSerializers
    })

   const notificationsConsumer = new Consumer({
        groupId: 'notifications-consumer-group',
        clientId: 'notifications-consumer',
        bootstrapBrokers: ['localhost:9092'],
        deserializers: stringDeserializers
    })

    const notificationsRouter = express.Router();
    notificationsRouter.get('/notifications', (req, res) => {
        res.status(200).json({
            notifications:[]
        });
    });


    notificationsRouter.get('/notifications/sessions', (req, res) => {
        const session_id = crypto.randomUUID()
        res.writeHead(200, {
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
        });
        ACTIVE_NOTIFICATIONS_SESSIONS[session_id] = res
        res.on("close", () => {
            res.end();
            delete ACTIVE_NOTIFICATIONS_SESSIONS[session_id]
        });
    });
    

    notificationsRouter.post('/notifications', zodBodyValidation(Notification), async (req, res) => {
        const notification = req.body
        const { userId, body } = notification;
        await notificationsProducer.send({
            messages: [
                {
                    topic: notification.channel,
                    key: notification.id,
                    value: notification.body,
                    headers: { source: 'api' }
                }
            ]
        })
        logger.info("notificationsProducer event ")
        res.status(201).json({ userId, body });
    });

    async function init() {
        const notificationAdmin = new Admin({
            clientId: 'my-admin-notification',
            bootstrapBrokers: ['localhost:9092']
        })
        const TOPICS = CHANNELS
        const CURRENT_TOPICS = await notificationAdmin.listTopics()
        const TOPIC_TO_CREATE = TOPICS.filter(topic => !CURRENT_TOPICS.includes(topic));

        if(TOPIC_TO_CREATE.length > 0){
            await notificationAdmin.createTopics({
                topics: [...TOPICS],
                partitions: 3,
                replicas: 1
            })
        }

        const stream = await notificationsConsumer.consume({
            autocommit: true,
            topics: ['APP'],
            sessionTimeout: 10000,
            heartbeatInterval: 500
        })

        stream.on('data', message => {
            const {key, value} = message
            logger.info({
                key, value
            },"notificationsConsumer event ")
          
        //   console.log(`Received: ${key} -> ${value}`)
          Object.values(ACTIVE_NOTIFICATIONS_SESSIONS).forEach(res => {
             const chunk = JSON.stringify({key, value});
             logger.info({
                event:{key, value},
            },"Dispatch event")
            res.write(`data: ${chunk}\n\n`);
          })

        })


    }

    return {
        router: notificationsRouter,
        init
    }
}
// -----------
// INIT SERVER
// -----------

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(pinoLogger)

const userModule = createUserModule()
const notificationModule = createNotificationsModule()
const healthModule = createHealthModule()

// app.use(pino)
app.use('/api', healthModule.router);
app.use('/api', userModule.router);
app.use('/api', notificationModule.router);


async function main(){
    logger.info(`START APP`)
    logger.info(`START KAFKA `)
    await notificationModule.init()
    logger.info(`START API`)
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}

main().catch((err) => {
    logger.error(`ERROR INITIALIZIND APP`, err)
    process.exit(1)
})
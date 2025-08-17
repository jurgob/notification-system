import { Admin, Consumer, Producer, stringDeserializers, stringSerializers } from '@platformatic/kafka'
import {CHANNELS, Notification,NotificationSessionCreate} from "../../types.js"
import express from 'express';
import { zodBodyValidation } from '../../utils/zod_utils.js';
import {pinoLogger} from '../../logger.js';
const {logger}= pinoLogger

// -----------
// NOTIFICATIONS
// -----------


export function createNotificationsModule(): { router: express.Router; init: () => Promise<void> } {
    const ACTIVE_NOTIFICATIONS_SESSIONS: Record<string, {res:express.Response, userId: string}> = {}
    const SENT_EVENTS: Record<any, any> = [] 

    const notificationsProducer = new Producer({
        clientId: 'notifications-producer',
        bootstrapBrokers: ['localhost:9092'],
        serializers: stringSerializers
    })

    const kafkaAppConsumerId = crypto.randomUUID()
    const notificationsConsumerAppChannel = new Consumer({
        groupId: `notifications-consumer-group-app-${kafkaAppConsumerId}`,
        clientId: 'notifications-consumer',
        bootstrapBrokers: ['localhost:9092'],
        deserializers: stringDeserializers
    })

    const notificationsConsumerEmailChannel = new Consumer({
        groupId: `notifications-consumer-group-email`,
        clientId: 'notifications-consumer',
        bootstrapBrokers: ['localhost:9092'],
        deserializers: stringDeserializers
    })

    const notificationsRouter = express.Router();
    notificationsRouter.get('/notifications', (req, res) => {
        res.status(200).json({
            notifications:SENT_EVENTS
        });
    });


    notificationsRouter.post('/notifications/sessions',zodBodyValidation(NotificationSessionCreate), (req, res) => {
        const {userId} = req.body
        
        res.writeHead(200, {
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
        });
        const session_id = crypto.randomUUID()
        ACTIVE_NOTIFICATIONS_SESSIONS[session_id] = {res,userId}
        logger.info(`/notifications/sessions STARTED, ${session_id}`);
        res.on("close", () => {
            logger.info(`/notifications/sessions CLOSED, ${session_id}`);
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
                    headers: { source: 'api',userId: notification.userId }
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

        const streamApp = await notificationsConsumerAppChannel.consume({
            autocommit: true,
            topics: ['APP'],
            sessionTimeout: 10000,
            heartbeatInterval: 500
        })

        streamApp.on('data', message => {
            const {key, value, headers} = message
            const userId = headers.get("userId")||"";
            logger.info({
                key, value,
                sessionsToNotify: Object.values(ACTIVE_NOTIFICATIONS_SESSIONS).length
            },"notificationsConsumer event ")
          
          Object.values(ACTIVE_NOTIFICATIONS_SESSIONS)
          .filter(ses => ses.userId === userId)
          .forEach(({res}) => {
             const chunk = JSON.stringify({key, value});
             logger.info({
                event:{key, value},
            },"-> Dispatch event")
            res.write(`data: ${chunk}\n\n`);
          })
            SENT_EVENTS.push({key, value,channel: 'APP'});

        })

        
        const streamEmail = await notificationsConsumerEmailChannel.consume({
            autocommit: true,
            topics: ['EMAIL'],
            sessionTimeout: 10000,
            heartbeatInterval: 500
        })

        streamEmail.on('data', message => {
            const {key, value} = message
            SENT_EVENTS.push({key, value, channel: 'EMAIL'});
        })


    }

    return {
        router: notificationsRouter,
        init
    }
}
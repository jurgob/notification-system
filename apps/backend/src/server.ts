import express from 'express';
import {z} from 'zod';
import { Consumer, jsonDeserializer, Producer, stringDeserializer, stringDeserializers, stringSerializers } from '@platformatic/kafka'
import { Admin } from '@platformatic/kafka'

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


// TYPES

const UserId = z.string().regex(/^USR-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid User ID format"
}).brand<'UserId'>();
type UserId = z.infer<typeof UserId>;

const UserName = z.string().min(2).max(100)
type UserName = z.infer<typeof UserName>;

const Email = z.email({ message: "Please provide a valid email" });;
type Email = z.infer<typeof Email>;

const NotificationId = z.string().regex(/^NOT-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid Notification ID format"
}).brand<'NotificationId'>();
type NotificationId = z.infer<typeof NotificationId>;


const OrganizationId = z.string().regex(/^ORG-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid Organization ID format"
}).brand<'OrganizationId'>();
type OrganizationId = z.infer<typeof OrganizationId>;

const CHANNELS = ['EMAIL', 'APP'] as const;
const Channel = z.enum(CHANNELS);
type Channel = z.infer<typeof Channel>;

const User = z.object({
    id: UserId,
    email: Email,
    name: UserName,
    organizationId: OrganizationId
});

const UserCreate = z.object({
    email: Email,
    name: UserName,
    organizationId: OrganizationId
});

const Notification = z.object({
    id: NotificationId,
    userId: UserId,
    channel: Channel,
    body: z.string().max(500)
});

type Notification = z.infer<typeof Notification>;


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
        // res.write(`data: ${chunk}\n\n`);
        res.on("close", () => {
            res.end();
            delete ACTIVE_NOTIFICATIONS_SESSIONS[session_id]
        });
    });


    notificationsRouter.post('/notifications', async (req, res) => {
        const notificationRequest = Notification.safeParse(req.body)
        if (!notificationRequest.success) {
            return res.status(400).json({ error: notificationRequest.error })
        }
        const notification = notificationRequest.data
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
          console.log(`Received: ${key} -> ${value}`)
          Object.values(ACTIVE_NOTIFICATIONS_SESSIONS).forEach(res => {
             const chunk = JSON.stringify({key, value});
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
// SHARED
// -----------


const userModule = createUserModule()
const notificationModule = createNotificationsModule()
const healthModule = createHealthModule()

app.use('/api', healthModule.router);
app.use('/api', userModule.router);
app.use('/api', notificationModule.router);


async function main(){
    console.log(`START APP`)
    console.log(`START KAFKA `)
    await notificationModule.init()
    console.log(`START API`)
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

main().catch((err) => {
    console.error(`ERROR INITIALIZIND APP`, err)
    process.exit(1)
})
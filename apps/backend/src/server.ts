import express  from 'express';
import { Admin } from '@platformatic/kafka'
import cors from 'cors';
import bodyParser from 'body-parser';
import {pinoLogger} from './logger.js';
const {logger}= pinoLogger
import {createNotificationsModule} from "./modules/notifications/notifications.js";



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
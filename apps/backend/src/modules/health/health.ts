import express  from 'express';
import { Admin } from '@platformatic/kafka'

// -----------
// STATUS
// -----------

export function createHealthModule(): { router: express.Router } {
    const statusRouter = express.Router();

    async function checkKafkaHealth() {
        const adminHealth = new Admin({
            clientId: 'my-admin-health',
            bootstrapBrokers: ['localhost:9092']
        })
        
    
        const res = await adminHealth.listGroups()
            .then(() => adminHealth.close())
            .then(() => {
                return { status: 'ok' ,};
            })
            .catch((err) => {
                return { status: 'error', error: err.message };
            })

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
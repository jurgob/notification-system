import axios from "axios";
import {User} from "../../types.js";


export function createUserSdk(base_url:string){
    async function getUsers() {   
        const response = await axios.get(`${base_url}/users`);
        return {
            status: response.status,
            data: response.data as { users: User[] }
        }
        
    }
   

    return {
        getUsers
    }

}
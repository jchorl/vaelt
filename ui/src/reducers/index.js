import { combineReducers } from 'redux';
import login from './login';
import register from './register';
import user from './user';

export default combineReducers({
    login,
    register,
    user,
})

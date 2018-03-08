import { combineReducers } from 'redux';
import login from './login';
import register from './register';
import u2f from './u2f';
import user from './user';
import vault from './vault';

export default combineReducers({
    login,
    register,
    u2f,
    user,
    vault,
})

import { combineReducers } from "redux";
import decrypt from "./decrypt";
import hibp from "./hibp";
import keys from "./keys";
import login from "./login";
import register from "./register";
import u2f from "./u2f";
import user from "./user";
import vault from "./vault";

export default combineReducers({
  decrypt,
  hibp,
  keys,
  login,
  register,
  u2f,
  user,
  vault,
});

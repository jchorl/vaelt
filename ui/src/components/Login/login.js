import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { connect } from "react-redux";
import { login } from "../../actions/login";
import LoginU2F from "../U2F/login";

class Login extends Component {
  static propTypes = {
    login: ImmutablePropTypes.contains({
      error: ImmutablePropTypes.contains({
        message: PropTypes.string.isRequired,
      }),
    }),
    loginUser: PropTypes.func.isRequired,
  };

  constructor() {
    super();

    this.state = {
      email: "",
      password: "",
    };
  }

  componentWillReceiveProps(nextProps) {
    if (
      !this.props.login.has("error") &&
      nextProps.login.getIn(["error", "message"]) === "U2F required"
    ) {
      this.setState({ u2f: true });
    }
  }

  handleInputChange = event => {
    const target = event.target;
    const value = target.type === "checkbox" ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value,
    });
  };

  submit = e => {
    e.preventDefault();

    const { email, password } = this.state;
    const { loginUser } = this.props;

    loginUser(email, password);
  };

  render() {
    const { login } = this.props;
    const { email, password, u2f } = this.state;

    return !u2f ? (
      <form className="inputContainer">
        <input
          type="text"
          name="email"
          value={email}
          onChange={this.handleInputChange}
          placeholder="Email"
        />
        <input
          type="password"
          name="password"
          value={password}
          onChange={this.handleInputChange}
          placeholder="Password"
        />
        {login.has("error") ? (
          <div className="errorText">{login.getIn(["error", "message"])}</div>
        ) : null}
        <button type="submit" onClick={this.submit} className="submitButton">
          {"Login"}
        </button>
      </form>
    ) : (
      <LoginU2F />
    );
  }
}

export default connect(
  state => ({ login: state.login }),
  dispatch => ({
    loginUser: (email, password) => dispatch(login(email, password)),
  })
)(Login);

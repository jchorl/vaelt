import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import { withRouter } from "react-router";
import { connect } from "react-redux";
import { fetchUserIfNeeded, logout } from "../../actions/user";
import "./nav.css";

class Nav extends Component {
  static propTypes = {
    fetchUserIfNeeded: PropTypes.func.isRequired,
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
    }).isRequired,
    user: ImmutablePropTypes.contains({
      email: PropTypes.string,
      receivedAt: PropTypes.number,
    }),
  };

  componentWillMount() {
    const { fetchUserIfNeeded } = this.props;
    fetchUserIfNeeded();
  }

  logout = () => {
    const { history, logout } = this.props;

    logout().then(() => history.push("/"), () => alert("Logout failed"));
  };

  render() {
    const { user } = this.props;

    return (
      <div className="nav">
        <div className="logo">Vælt</div>
        <div>
          {user.has("receivedAt") ? (
            <div>
              <span>Hi, {user.getIn(["user", "email"])}!</span>
              <button className="logoutButton" onClick={this.logout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

export default withRouter(
  connect(
    state => ({ user: state.user }),
    dispatch => ({
      fetchUserIfNeeded: () => dispatch(fetchUserIfNeeded()),
      logout: () => dispatch(logout()),
    })
  )(Nav)
);

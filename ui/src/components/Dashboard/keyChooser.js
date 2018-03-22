import React, { Component } from "react";
import PropTypes from "prop-types";
import ImmutablePropTypes from "react-immutable-proptypes";
import "./keyChooser.css";

export default class KeyChooser extends Component {
  static propTypes = {
    keys: ImmutablePropTypes.listOf(
      ImmutablePropTypes.contains({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      }).isRequired
    ).isRequired,
    onChange: PropTypes.func.isRequired,
    checked: ImmutablePropTypes.mapOf(PropTypes.bool).isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      expanded: false,
    };
  }

  handleInputChange = event => {
    const target = event.target;
    const value = target.checked;
    const name = target.name;

    const { onChange, checked } = this.props;
    onChange(checked.set(name, value));
  };

  toggle = () => {
    this.setState({
      expanded: !this.state.expanded,
    });
  };

  render() {
    const { expanded } = this.state;
    const { checked, keys } = this.props;

    return (
      <div className="keyChooser">
        <div className="advancedToggle" onClick={this.toggle}>
          {expanded ? (
            <i className="fa fa-caret-down triangle" />
          ) : (
            <i className="fa fa-caret-right triangle" />
          )}
          Choose which keys to encrypt with
        </div>
        {expanded ? (
          <div>
            {keys.map(k => (
              <div className="keyEntry" key={k.get("id")}>
                <div>
                  <input
                    id={k.get("id")}
                    name={k.get("id")}
                    type="checkbox"
                    checked={checked.get(k.get("id"))}
                    onChange={this.handleInputChange}
                  />
                  <label htmlFor={k.get("id")} className="toggle" />
                </div>
                {k.get("name")}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
}

class TopLeft extends React.Component {
  constructor(props) {
    super(props);
    this.state = { items: [], text: '', signedin: false };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
    if (this.state.signedin) {
      return React.createElement(
        "div",
        null,
        React.createElement(
          "label",
          null,
          "Signed In"
        ),
        React.createElement(
          "button",
          null,
          "?"
        ),
        React.createElement(
          "button",
          null,
          "+"
        ),
        React.createElement(
          "button",
          null,
          "🏠"
        ),
        React.createElement(
          "p",
          null,
          ""
        ),
        React.createElement("input", {
          id: "searchBar",
          onChange: this.handleChange,
          value: this.state.text
        }),
      )
    }
    return React.createElement(
      "div",
      null,
      React.createElement(
        'button',
        { onClick: () => this.setState({ signedin: true }) },
        'Sign In'
      ),
      React.createElement(
        "button",
        null,
        "?"
      ),
      React.createElement(
        "button",
        null,
        "+"
      ),
      React.createElement(
        "button",
        null,
        "🏠"
      ),
      React.createElement(
        "p",
        null,
        ""
      ),
      React.createElement("input", {
        id: "searchBar",
        onChange: this.handleChange,
        value: this.state.text
      }),
    )
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  handleSubmit(e) {
    e.preventDefault();
    if (this.state.text.length === 0) {
      return;
    }
    const newItem = {
      text: this.state.text,
      id: Date.now()
    };
    this.setState(state => ({
      items: state.items.concat(newItem),
      text: ''
    }));
  }
}

class TopRight extends React.Component {
  constructor(props) {
    super(props);
    this.state = { items: [], text: '' };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
    return React.createElement(
      "div",
      null,
      React.createElement(
        "button",
        null,
        "+"
      ),
      React.createElement(
        "button",
        null,
        "-"
      )
    );
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  handleSubmit(e) {
    e.preventDefault();
    if (this.state.text.length === 0) {
      return;
    }
    const newItem = {
      text: this.state.text,
      id: Date.now()
    };
    this.setState(state => ({
      items: state.items.concat(newItem),
      text: ''
    }));
  }
}

class BottomLeft extends React.Component {
  constructor(props) {
    super(props);
    this.state = { items: [], text: '', translated: false };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  render() {
    if (this.state.translated) {
      return React.createElement(
        "div",
        null,
        React.createElement("input", {
          id: "searchBar2",
          onChange: this.handleChange,
          value: this.state.text
        }),
        React.createElement(
          "button",
          null,
          "Tags"
        ),
        React.createElement(
          "button",
          null,
          "New!"
        ),
        React.createElement(
          'button',
          { onClick: () => this.setState({ translated: false }) },
          'English'
        ),
      );
    }

    return React.createElement(
      "div",
      null,
      React.createElement("input", {
        id: "searchBar2",
        onChange: this.handleChange,
        value: this.state.text
      }),
      React.createElement(
        "button",
        null,
        "Tags"
      ),
      React.createElement(
        "button",
        null,
        "New!"
      ),
      React.createElement(
        'button',
        { onClick: () => this.setState({ translated: true }) },
        'Cymraeg'
      ),
    );
  }


  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  handleSubmit(e) {
    e.preventDefault();
    if (this.state.text.length === 0) {
      return;
    }
    const newItem = {
      text: this.state.text,
      id: Date.now()
    };
    this.setState(state => ({
      items: state.items.concat(newItem),
      text: ''
    }));
  }
}

class Popup extends React.Component {
  constructor(props) {
    super(props);
    this.state = { popupOpen: false };
  }

  backgroundDim() {
    let background = document.getElementById("image");
    if (this.state.popupOpen) {
      background.style.opacity = "0.5";
    } else {
      background.style.opacity = "1";
    }
  }

  render() {
    this.backgroundDim();
    if (!this.state.popupOpen) {
      return React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          { onClick: () => this.setState({ popupOpen: true }) },
          "Open Popup"
        ),
      );
    } else {
      return React.createElement(
        "div",
        null,
        React.createElement(
          "button",
          { onClick: () => this.setState({ popupOpen: false }) },
          "Close Popup"
        ),
        <div className="popupBox">
          <button className="tags">Animals</button>
          <button className="tags">Plants</button>
          <button className="tags">Rocks</button>
          <button className="tags">People</button>
          <button className="tags">Weather</button>
          <button className="tags">Me</button>
          <button onClick={() => this.setState({ popupOpen: false})} className="closePopup">X</button>
          <label>Username</label>
          <br></br>
          <br></br>
          <input className="title" placeholder="Title"></input>
          <br></br>
          <br></br>
          <input className="description" placeholder="Description"></input>
        </div>
      );
    }
  }
}








ReactDOM.render(React.createElement(BottomLeft, null), document.getElementById('bottomLeftControls'));

ReactDOM.render(React.createElement(TopRight, null), document.getElementById('topRightControls'));

ReactDOM.render(React.createElement(TopLeft, null), document.getElementById('topLeftControls'));

ReactDOM.render(React.createElement(Popup, null), document.getElementById('popupContainer'));
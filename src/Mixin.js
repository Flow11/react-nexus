import Lifespan from 'lifespan';

export default (Nexus) => ({

  _nexusBindingsLifespan: null,

  getNexus() {
    if(__DEV__) {
      (Nexus.currentNexus !== null).should.be.true;
    }
    return Nexus.currentNexus;
  },

  getNexusBindingsLifespan() {
    return this._nexusBindingsLifespan;
  },

  getInitialState() {
    if(__DEV__) {
      if(!_.isFunction(this.getNexusBindings)) {
        throw new TypeError(`You MUST define getNexusBindings on React class ${this.displayName}.`);
      }
    }
    const bindings = this.getNexusBindings(this.props);
    const state = {};
    _.each(bindings, ([flux, path], stateKey) => {
      if(flux.isPrefetching) {
        state[stateKey] = flux.getPrefetched(path); // will return the immutable head
      }
      else if(flux.isInjecting) {
        state[stateKey] = flux.getInjected(path); // will return the immutable head
      }
      else {
        state[stateKey] = null;
      }
    });
    return state;
  },

  prefetchNexusBindings: Promise.coroutine(function*() {
    const bindings = this.getNexusBindings(this.props);
    yield Promise.all(_.map(bindings, ([flux, path]) => flux.isPrefetching ? flux.prefetch(path) : Promise.resolve(0)));
    return this;
  }),

  applyNexusBindings(props) {
    const previousBindingsLifespan = this.getNexusBindingsLifespan();
    this._nexusBindingsLifespan = new Lifespan();
    const bindings = this.getNexusBindings(props);
    _.each(bindings, ([flux, path], stateKey) => this.setState({
      [stateKey]: flux.Store(path, this._nexusBindingsLifespan)
        .onUpdate(({ head }) => this.setState({ [stateKey]: head }))
        .onDelete(() => this.setState({ [stateKey]: void 0 }))
        .value, // will also return the immutable head
    }));
    if(previousBindingsLifespan) {
      previousBindingsLifespan.release();
    }
  },

  componentDidMount() {
    this.applyNexusBindings(this.props);
  },

  componentWillUnmount() {
    if(this._nexusBindingsLifespan) {
      this._nexusBindingsLifespan.release();
    }
  },

  componentWillReceiveProps(nextProps) {
    this.applyNexusBindings(nextProps);
  },

});

import { Route, Switch } from 'wouter';
import EditorScreen from './components/EditorScreen';
import '../style.css';
import { ReviewScreen } from './components/ReviewScreen.tsx';

function App() {
  return (
    <div className="App">
      <Switch>
        <Route path="/" component={EditorScreen} />
        <Route path="/review" component={ReviewScreen}></Route>
      </Switch>
    </div>
  );
}

export default App;

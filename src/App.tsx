import "./App.css";
import Layout from "./components/Layout/Layout";
import { logUser } from "./firebase";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        <button
          onClick={() => {
            // uploadText("ff");
            logUser();
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;

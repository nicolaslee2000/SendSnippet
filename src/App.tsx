import "./App.css";
import "./variables.css";
import Layout from "./components/Layout/Layout";
import { downloadFiles, keytest, uploadKeys } from "./firebase/firebase";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        {/* DEVELOPMENT */}
        <button
          onClick={async () => {
            // uploadKeys();
            await keytest();
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;

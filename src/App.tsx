import "./App.css";
import "./variables.css";
import Layout from "./components/Layout/Layout";
import { downloadFiles, uploadKeys } from "./firebase/firebase";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        {/* DEVELOPMENT */}
        {/* <button
          onClick={async () => {
            uploadKeys();
          }}
        >
          test
        </button> */}
      </div>
    </div>
  );
}

export default App;

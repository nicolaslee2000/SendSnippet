import "./App.css";
import Layout from "./components/Layout/Layout";
import { uploadKeys, uploadText } from "./firebase/firebase";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        <button
          onClick={async () => {
            uploadKeys();
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;

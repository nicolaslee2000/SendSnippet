import "./App.css";
import Layout from "./components/Layout/Layout";
import { uploadText } from "./firebase/firebase";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        <button
          onClick={async () => {
            uploadText("asdf");
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;

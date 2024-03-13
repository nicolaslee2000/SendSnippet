import "./App.css";
import Layout from "./components/Layout/Layout";
import { uploadText } from "./firebase";

function App() {
  return (
    <div className="App">
      <Layout />
      <div>
        <button
          onClick={() => {
            uploadText("ff");
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;

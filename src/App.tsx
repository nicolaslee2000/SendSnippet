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
            const a = await uploadText("asdf");
            console.log(a);
          }}
        >
          test
        </button>
      </div>
    </div>
  );
}

export default App;

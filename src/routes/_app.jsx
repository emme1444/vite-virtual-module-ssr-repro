import { useState, useEffect } from "react";

const App = () => {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    console.log("checked:", checked);
  }, [checked]);

  return (
    <div className="test">
      <span>Hello world!</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
      />
    </div>
  );
};

export default App;

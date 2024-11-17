import React, { useEffect, useMemo, useState } from "react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import {
  InputTransactionData,
  useWallet,
} from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import styled from "styled-components";

const moduleName = "RockPaperScissors_01";
const moduleAddress = "0x610ea90387f24c61fa507060dfb272a901ef420411473ab344cc45d72904e3bb";
const client = new Aptos(new AptosConfig({ network: Network.TESTNET }));

const WindowWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const WalletWrapper = styled.div`
  position: absolute;
  align-items: right;
  right: 10px;
  top: 10px;
  background-color: #f0f0f0;
`;

const CenteredWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f0f0;
`;

const GameWrapper = styled.div`
  width: 550px;
  padding: 20px;
  background-color: #fff;
  border-radius: 30px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 20px;
`;

const InternalWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const Display = styled.div`
  background-color: #e0e0e0;
  color: black;
  font-size: 18px;
  padding: 20px;
  border-radius: 15px;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
`;

const DisplayHeading = styled.div`
  background-color: transparent;
  color: black;
  font-size: 20px;
  padding: 5px;
  font-weight: bold;
  margin-bottom: 5px;
  text-align: center;
`;

const ResultBox = styled.div<{
  color?: string;
  wide?: boolean;
  disabled?: boolean;
}>`
  background-color: ${({ color, disabled }) =>
    disabled ? "#c0c0c0" : color || "#4CAF50"};
  width: 500px;
  color: ${({ disabled }) => (disabled ? "#888888" : "black")};
  font-size: 24px;
  padding: 20px;
  border: none;
  border-radius: 15px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  font-weight: bold;
  margin-top: 20px;
  text-align: center;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

const Button = styled.button<{
  color?: string;
  wide?: boolean;
  disabled?: boolean;
}>`
  background-color: ${({ color, disabled }) =>
    disabled ? "#c0c0c0" : color || "#d0d0d0"};
  color: ${({ disabled }) => (disabled ? "#888888" : "black")};
  font-size: 24px;
  padding: 20px;
  border: none;
  border-radius: 15px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  grid-column: ${({ wide }) => (wide ? "span 2" : "span 1")};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  &:hover {
    opacity: ${({ disabled }) => (disabled ? "1" : "0.8")};
  }
`;

const OperationButton = styled(Button)`
  background-color: ${({ disabled }) => (disabled ? "#c0c0c0" : "#ff9500")};
  color: ${({ disabled }) => (disabled ? "#888888" : "white")};
`;

const ToggleButton = styled.button<{ active: boolean }>`
  background-color: ${({ active }) => (active ? "#f44336" : "#4CAF50")};
  color: white;
  font-size: 18px;
  padding: 10px 20px;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  margin-bottom: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  &:hover {
    opacity: 0.8;
  }
`;


const ComputerButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  justify-content: center;
  align-items: center;
`;

const ComputerButton = styled.div<{
  color?: string;
  wide?: boolean;
  disabled?: boolean;
}>`
  background-color: ${({ color, disabled }) =>
    disabled ? "#c0c0c0" : color || "#d0d0d0"};
  color: ${({ disabled }) => (disabled ? "#888888" : "black")};
  font-size: 24px;
  padding: 20px;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 15px;
  grid-column: ${({ wide }) => (wide ? "span 2" : "span 1")};
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const ComputerOperationButton = styled(ComputerButton)`
  background-color: ${({ disabled }) => (disabled ? "#c0c0c0" : "#ff9500")};
  color: ${({ disabled }) => (disabled ? "#888888" : "white")};
`;

const App: React.FC = () => {
  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [computerSelection, setComputerSelection] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(false);
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [amount, setAmount] = useState<number>(0);
  const [multiplier, setMultiplier] = useState<number>(0.25);
  const [transactionInProgress, setTransactionInProgress] =
    useState<boolean>(false);

  const toggleActiveState = async () => {
    setIsActive(!isActive);
    if (!account) return;
    if (!isActive) {
      console.log("Toggling active state: " + isActive);
      const payload: InputTransactionData = {
        data: {
          function: `${moduleAddress}::${moduleName}::createGame`,
          functionArguments: [],
        },
      };
      const response = await signAndSubmitTransaction(payload);
      console.log("The resposnse is",response);
    }
    setInput("");
    setResult("");
    setComputerSelection("");
  };

  const handleOperationClick = async (operation: string) => {
    setResult("");
    setComputerSelection("");
    if (
      operation === "Rock" ||
      operation === "Paper" ||
      operation === "Scissors"
    ) {
      setInput(` ${operation} `);
      try {
        if (!account) return;
        setTransactionInProgress(true);
        const payload: InputTransactionData = {
          data: {
            function: `${moduleAddress}::${moduleName}::duel`,
            functionArguments: [operation],
          },
        };
        const response = await signAndSubmitTransaction(payload);
        console.log("the resposnse is",response)
        const resultData = await client.getAccountResource({
          accountAddress: account?.address,
          resourceType: `${moduleAddress}::${moduleName}::DuelResult`,
        });
        console.log("The result is",resultData);
        setResult(resultData.duel_result.toString());
        setComputerSelection(resultData.computer_selection.toString());
      } catch (error) {
        console.error(error);
      } finally {
        setTransactionInProgress(false);
      }
    } else {
      setInput(` ${operation} `);
    }
  };

  const handleAmount = (value: number) =>{
    setAmount(value);
  }

  const handleMultiplier = (ans:string)=>{
    if( ans == "Win"){
      setMultiplier(multiplier+0.25);
    }
    else {
      setMultiplier(0.25)
    }
  }

  const Decide = (ans: string) => {
    // Reset multiplier if the user withdraws or loses
    if (ans === "withdraw" || ans === "Lose" || ans === "Draw") {
      handleMultiplier("Lose");
    } else {
      handleMultiplier("Win");
    }
    setResult(""); // Clear result after decision
  };


  const choiceBox = () => {
    return (
      <div
        style={{
          boxShadow: "10px 10px 20px rgba(0, 0, 0, 0.2)", // Correct style property
          padding: "20px",
          borderRadius: "10px",
          textAlign: "center",
          backgroundColor: "#fff",
          position : "fixed",
          inset : 0, // Optional for a cleaner look
        }}
      >
        <h2>{result || "No result yet"}</h2>
        <div style={{ marginTop: "10px" }}>
          <button
            style={{
              marginRight: "10px",
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "#4CAF50",
              color: "#fff",
              cursor: "pointer",
            }}
            onClick={() => Decide("withdraw")}
          >
            Withdraw
          </button>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "#f44336",
              color: "#fff",
              cursor: "pointer",
            }}
            onClick={() => Decide("win")}
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  const handleResult = (res: string) => {
    // Handling the result when win, draw or loss
    if (res === "Win") {
      return choiceBox(); // Show win message if won
    } else if (res === "Draw" || res === "Lose") {
      handleMultiplier("Lose"); // Reset multiplier if it's a loss or draw
    }
  };

  useEffect( ()=> {
    handleResult(result);
  },[result])
  

  const connectedView = () => {
    return (
      <CenteredWrapper>
        {result == "Win" ? handleResult(result) : <div></div> }

        {amount <=0 ? <h1>Enter the amount to start the game</h1> :<ToggleButton active={isActive} onClick={toggleActiveState}>
          {isActive ? "Stop Game" : "Start Game"}
        </ToggleButton>}
        <div ><input value={amount} onChange={(event) => handleAmount(Number(event.target.value))} style={{borderRadius: "0.5rem", padding : "12px"}} type="number" name="" placeholder="Enter the amount" id="inputAmount" /> <h3> X {multiplier}</h3> </div>
        <InternalWrapper>
          <GameWrapper>
            <DisplayHeading>
              {/* <p>Your Move</p> */}
              {<Display>{input || "Select Your Move"}</Display>}
            </DisplayHeading>
            <ButtonGrid>
              <Button
                color="#FF6663"
                onClick={() => {
                  setInput("");
                  setResult("");
                  setComputerSelection("");
                }}
                disabled={!isActive}
              >
                Clear
              </Button>
              {/* <Button color="#FF33FF" onClick={() => setInput(input + '  ')} disabled={!isActive}>^</Button> */}
              <OperationButton
                onClick={() => {
                  handleOperationClick("Rock");
                }}
                disabled={!isActive}
              >
                Rock
              </OperationButton>
              <OperationButton
                onClick={() => handleOperationClick("Paper")}
                disabled={!isActive}
              >
                Paper
              </OperationButton>
              <OperationButton
                onClick={() => handleOperationClick("Scissors")}
                disabled={!isActive}
              >
                Scissors
              </OperationButton>
            </ButtonGrid>
          </GameWrapper>
          {"          "}
          <GameWrapper>
            <DisplayHeading>
              {/* <p>Computer Move</p> */}
              {!computerSelection && (
                <Display>{computerSelection || "Computer Move"}</Display>
              )}
              {computerSelection && <Display>{computerSelection}</Display>}
            </DisplayHeading>
            <ComputerButtonGrid>
              <ComputerOperationButton disabled={!isActive}>
                Rock
              </ComputerOperationButton>
              <ComputerOperationButton disabled={!isActive}>
                Paper
              </ComputerOperationButton>
              <ComputerOperationButton disabled={!isActive}>
                Scissors
              </ComputerOperationButton>
            </ComputerButtonGrid>
          </GameWrapper>
        </InternalWrapper>
        {!result && (
          <ResultBox disabled={!isActive}>{result || "Game Result"}</ResultBox>
        )}
        {result && result != "Game not yet played" && result != "Draw" && (
          <ResultBox disabled={!isActive}>You {result}</ResultBox>
        )}
        {result && (result == "Game not yet played" || result == "Draw") && (
          <ResultBox disabled={!isActive}>{result}</ResultBox>
        )}
      </CenteredWrapper>
    );
  };

  const notConnectedView = () => {
    return (
      <WindowWrapper>
        <h1>Please connect your wallet to continue</h1>
      </WindowWrapper>
    );
  };

  return (
    <WindowWrapper>
      <WalletWrapper>
        <WalletSelector />
      </WalletWrapper>
      {connected ? connectedView() : notConnectedView()}
    </WindowWrapper>
  );
};

export default App;

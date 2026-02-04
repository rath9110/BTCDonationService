import time
import random
import json
import os
from web3 import Web3
from eth_account import Account
from colorama import Fore, Style, init

init(autoreset=True)

# --- Configuration ---
RPC_URL = "http://127.0.0.1:8545"
w3 = Web3(Web3.HTTPProvider(RPC_URL))

if not w3.is_connected():
    print(Fore.RED + "Error: Could not connect to Hardhat Node.")
    exit(1)

print(Fore.GREEN + f"Connected to {RPC_URL}")

# Addresses from deployment
REP_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
AUDIT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

# Artifacts
ARTIFACTS_DIR = "../artifacts/contracts"

def load_abis():
    try:
        with open(f"{ARTIFACTS_DIR}/ReputationToken.sol/ReputationToken.json") as f:
            rep_json = json.load(f)
        with open(f"{ARTIFACTS_DIR}/AuditManager.sol/AuditManager.json") as f:
            audit_json = json.load(f)
        return rep_json["abi"], audit_json["abi"]
    except FileNotFoundError:
        print(Fore.RED + "Artifacts not found. Did you run 'npx hardhat compile'?")
        exit(1)

REP_ABI, AUDIT_ABI = load_abis()

# Contracts
rep_token = w3.eth.contract(address=REP_ADDRESS, abi=REP_ABI)
audit_manager = w3.eth.contract(address=AUDIT_ADDRESS, abi=AUDIT_ABI)

# Accounts
# Hardhat default accounts (pre-funded)
# we can access them if passing them via command line or just using w3.eth.accounts
accounts = w3.eth.accounts
deployer = accounts[0]

HONEST_COUNT = 3
LAZY_COUNT = 2
VALIDATORS = []

def setup_validators():
    print(Fore.CYAN + "\n--- Setting up Validators ---")
    
    # 1. Distribute REP to validators
    stake_amount = w3.to_wei(100, 'ether')
    
    # Create honest validators
    for i in range(HONEST_COUNT):
        acct = accounts[i+1]
        setup_single_validator(acct, "Honest", stake_amount)
        VALIDATORS.append({"address": acct, "type": "Honest", "slashed": False})

    # Create lazy validators
    for i in range(LAZY_COUNT):
        acct = accounts[i+1+HONEST_COUNT]
        setup_single_validator(acct, "Lazy", stake_amount)
        VALIDATORS.append({"address": acct, "type": "Lazy", "slashed": False})

def setup_single_validator(acct, v_type, amount):
    # Transfer REP
    tx = rep_token.functions.mint(acct, amount).transact({'from': deployer})
    w3.eth.wait_for_transaction_receipt(tx)
    
    # Approve AuditManager
    tx = rep_token.functions.approve(AUDIT_ADDRESS, amount).transact({'from': acct})
    w3.eth.wait_for_transaction_receipt(tx)
    
    # Register
    try:
        tx = audit_manager.functions.registerValidator(amount).transact({'from': acct})
        w3.eth.wait_for_transaction_receipt(tx)
        print(f"Validator {v_type} ({acct[:6]}...) registered.")
    except Exception as e:
        print(Fore.YELLOW + f"Validator {acct[:6]}... already registered or failed: {e}")

def run_simulation(rounds=10):
    print(Fore.CYAN + f"\n--- Starting {rounds} Rounds Simulation ---")
    
    for r in range(rounds):
        print(f"\nRound {r+1}:")
        
        # 1. Create Receipt (10% chance of Trapdoor)
        is_trapdoor = random.random() < 0.3 # 30% trapdoor chance
        receipt_hash = w3.keccak(text=f"receipt_{r}_{time.time()}")
        
        # Submit receipt (as deployer/admin)
        tx = audit_manager.functions.submitReceipt(receipt_hash, is_trapdoor).transact({'from': deployer})
        receipt = w3.eth.wait_for_transaction_receipt(tx)
        
        # Get Receipt ID (from event)
        # Decoding logs is verbose in web3.py without strict ABI mapping, 
        # but we know id is nextReceiptId - 1.
        receipt_id = audit_manager.functions.nextReceiptId().call() - 1
        
        print(f"Receipt ID {receipt_id} submitted. Trapdoor: {Fore.RED if is_trapdoor else Fore.GREEN}{is_trapdoor}{Style.RESET_ALL}")
        
        # 2. Validators Vote
        random.shuffle(VALIDATORS)
        for val in VALIDATORS:
            if val["slashed"]: continue
            
            # Decision Logic
            vote_valid = True
            if val["type"] == "Honest":
                # Honest checks: if trapdoor, vote False. If real, vote True.
                if is_trapdoor:
                    vote_valid = False
                else:
                    vote_valid = True
            elif val["type"] == "Lazy":
                # Lazy always votes True
                vote_valid = True
            
            # Cast Vote
            try:
                tx = audit_manager.functions.vote(receipt_id, vote_valid).transact({'from': val["address"]})
                w3.eth.wait_for_transaction_receipt(tx)
                print(f"  Validator ({val['type']}) voted {vote_valid}")
            except Exception as e:
                # Check if it was a slash
                err_str = str(e)
                if "revert" in err_str:
                    # check if slashed
                    v_data = audit_manager.functions.validators(val["address"]).call()
                    # v_data struct: (bool isActive, uint256 stakedReputation)
                    # wait, return from tuple is indexed
                    is_active = v_data[0]
                    if not is_active:
                         print(Fore.RED + f"  busted! Validator ({val['type']}) was SLASHED!")
                         val["slashed"] = True
                    else:
                         print(Fore.YELLOW + f"  Vote failed: {e}")

    # Summary
    print(Fore.CYAN + "\n--- Simulation Summary ---")
    for val in VALIDATORS:
        status = Fore.RED + "SLASHED" if val["slashed"] else Fore.GREEN + "ACTIVE"
        print(f"{val['type']} Validator ({val['address'][:6]}...): {status}{Style.RESET_ALL}")

if __name__ == "__main__":
    setup_validators()
    run_simulation(rounds=10)

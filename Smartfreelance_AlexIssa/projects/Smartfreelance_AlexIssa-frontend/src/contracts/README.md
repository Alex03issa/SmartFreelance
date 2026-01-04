---

````md
# SmartFreelance – Web3 Freelance Marketplace (POC)

SmartFreelance is a **Web3-enabled freelance marketplace proof of concept** built on **Algorand TestNet**.  
It demonstrates wallet-based identity, agreement-based payments, and NFT-based delivery proof.

This project is a **frontend-focused POC** with mocked marketplace data and real wallet interactions for agreement actions.

---

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Algorand TestNet
- Pera Wallet
- @txnlab/use-wallet
- LocalStorage (POC persistence)

---

## Prerequisites

Before running the project, ensure you have:

- **Node.js** v18 or newer
- **npm**
- **Pera Wallet** (mobile or browser)
- Pera Wallet set to **Algorand TestNet**
- Some **TestNet ALGO** in your wallet

---

## Installation

Clone the repository and install dependencies:

```bash
git clone <your-repo-url>
cd smartfreelance
npm install
````

---

## Running the Project (Development)

Start the development server:

```bash
npm run dev
```

The app will be available at:

```
http://localhost:5173
```

---

## Wallet Connection

* Click **Connect Wallet** on the onboarding screen
* Select **Pera Wallet**
* Approve the connection in your wallet

After connection:

* If **Auto-enter dashboard** is enabled → you enter the dashboard immediately
* If disabled → click **Enter Dashboard**

The auto-enter behavior can be toggled on the onboarding screen.

---

## Dashboard Overview

The application supports **two roles**:

* **Client**
* **Freelancer**

Roles can be switched at any time from the dashboard UI.

---

## Client Workflow

### 1. Browse Freelancers

* View a list of freelancers (mocked data)
* Send invitations to freelancers (POC behavior)

### 2. Post a Job

* Create a job with:

  * Title
  * Description
  * Category
  * Budget (ALGO)

Jobs are stored locally (LocalStorage).

**Rules:**

* A job **cannot be deleted** if:

  * A freelancer has submitted a proposal
  * An agreement already exists
* Delete button becomes **locked / disabled** when deletion is not allowed

### 3. Agreements

* View agreements created from proposals
* Fund agreements using ALGO
* Review delivery
* Approve delivery to close the agreement

---

## Freelancer Workflow

### 1. Browse Jobs

* View all posted jobs
* Submit proposals with:

  * Message
  * Proposed ALGO amount

### 2. My Proposals

* View submitted proposals
* **Delete proposal only if**:

  * The proposal has NOT been accepted
* Proposal becomes **locked** once an agreement exists

### 3. Agreements

* View active agreements
* Deliver work
* Mint Delivery NFTs
* Wait for client approval

---

## Agreement Workflow (On-chain Actions)

All blockchain interactions happen inside the **Agreement Details** screen.

Marketplace data (jobs, proposals, invites) is mocked and stored locally using LocalStorage.

---

## Delivery NFT Model (Important)

For each completed agreement, **one Delivery NFT (Algorand ASA)** is minted with a **total supply of 2**.

This allows **both parties to hold one copy** of the same Delivery NFT.

* **Freelancer keeps one copy**

  * Proof that the work was delivered
* **Client receives one copy**

  * Proof that the work was received and approved

Both copies:

* Share the same **asset ID**
* Share the same **ARC3 metadata**
* Represent immutable on-chain proof of the completed agreement

This model simplifies opt-in logic while preserving verifiable delivery proof for both parties.

---

## 1) Fund Agreement (Client)

**Purpose:** simulate an escrow-style funding step.

Steps:

1. Open **Agreement Details** as Client
2. Click **Pay ALGO (Fund)**
3. Pera Wallet opens a payment transaction
4. Confirm / sign
5. Wait for confirmation

Result:

* Agreement status becomes **FUNDED**
* Delivery actions become available

---

## 2) Deliver Work & Mint Delivery NFT (Freelancer)

**Purpose:** create on-chain proof of delivery.

Steps:

1. Open **Agreement Details** as Freelancer
2. Click **Mint Delivery NFT**
3. Delivery metadata is generated (POC reference)
4. Wallet opens the mint transaction
5. Confirm / sign
6. Wait for confirmation

On-chain result:

* One Delivery NFT ASA is created
* Total supply = 2
* Freelancer holds 1 copy
* Client copy is reserved for transfer

Agreement status becomes **DELIVERED**.

---

## 3) Client Opt-in to Delivery NFT (Required)

### Why opt-in is required

Algorand requires any account receiving an ASA (NFT) to **opt-in first**.

Since the client receives **one copy of the Delivery NFT**:

➡️ **Client MUST opt-in to the Delivery NFT asset**

### Opt-in steps:

1. Open **Agreement Details** as Client
2. Click **Opt-in to Delivery NFT**
3. Pera Wallet opens a 0-ALGO opt-in transaction
4. Confirm / sign
5. Wait for confirmation

Without opt-in, NFT transfer will fail.

---

## 4) Send Client NFT Copy (Freelancer)

Steps:

1. Client completes opt-in
2. Freelancer clicks **Send Client Copy**
3. Wallet opens asset transfer transaction
4. Confirm / sign

Result:

* Client receives 1 of 2 NFT copies
* Both parties now hold delivery proof

---

## 5) Approve Delivery & Close Agreement (Client)

Steps:

1. Review delivery NFT and metadata
2. Click **Approve Delivery**
3. Agreement status becomes **APPROVED**

Result:

* Agreement is completed
* Both parties hold immutable NFT proof

---

## Summary of NFT Ownership

| Asset              | Owner             | Purpose                 |
| ------------------ | ----------------- | ----------------------- |
| Delivery NFT (1/2) | Freelancer wallet | Proof of work delivered |
| Delivery NFT (1/2) | Client wallet     | Proof of work received  |

---

## Local Storage (POC)

Stored in browser LocalStorage:

* Jobs
* Proposals
* Agreements
* Invites
* UI preferences (auto-enter dashboard)

Clearing browser storage resets the marketplace state.

---

## Available Commands

```bash
npm install
npm run dev
```

---

## Notes & Limitations

* Proof of Concept only
* No backend or database
* No smart-contract escrow
* Marketplace data is local to the browser
* Designed for **Algorand TestNet**

---

## Author & Rights

**All rights of this idea are reserved to Alexander Issa.**

---

```



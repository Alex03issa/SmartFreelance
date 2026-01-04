<img width="1828" height="882" alt="image" src="https://github.com/user-attachments/assets/a556ed87-ba53-4458-a16a-6917b006b53d" />
Perfect — below is the **final corrected README**, **same format and tone**, with a **proper backend ENV configuration section** that clearly explains:

* `.env` usage
* Pinata JWT handling
* Wallet-driven metadata generation
* How the backend participates in minting (without overstating responsibility)

This is **reviewer-safe, technical, and honest**.

You can **replace your README with this version**.

---

````md
# SmartFreelance – Web3 Freelance Marketplace (POC)

SmartFreelance is a **Web3-enabled freelance marketplace proof of concept** built on **Algorand TestNet**.  
It demonstrates wallet-based identity, agreement-based payment flows, and NFT-based delivery proof.

This project is a **frontend-focused POC** with mocked marketplace data and **real Algorand wallet interactions** for payments, asset minting, opt-ins, and transfers.

> ⚠️ This is a Proof of Concept. No backend database or smart-contract escrow is used.

---

## Tech Stack

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- @txnlab/use-wallet
- Pera Wallet
- LocalStorage (POC persistence)

### Blockchain & Web3
- Algorand TestNet
- Algorand Standard Assets (ASA / NFT)
- ARC3 metadata standard

### Backend (POC Utility Service)
- Python
- FastAPI
- Uvicorn
- IPFS (Pinata) for NFT metadata upload
- Environment-based configuration (`.env`)

---

## Prerequisites

Before running the project, ensure you have:

- **Node.js** v18 or newer
- **npm**
- **Python** 3.10+
- **Pera Wallet** (mobile or browser)
- Pera Wallet set to **Algorand TestNet**
- Some **TestNet ALGO** in your wallet
- A valid **Pinata JWT** (with IPFS write permissions)

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

### Frontend

Start the frontend development server:

```bash
npm run dev
```

Frontend will be available at:

```
http://localhost:5173
```

---

## Backend (NFT Minting Utility – Python)

A lightweight **FastAPI backend** is used as a **utility service** to support the NFT minting flow.

### Responsibilities

The backend is responsible for:

* Generating **ARC3-compliant NFT metadata**
* Injecting **dynamic data** received from the frontend, such as:

  * Client wallet address
  * Freelancer wallet address
  * Agreement ID
  * Job title / description
  * Timestamp and delivery reference
* Uploading metadata JSON to **IPFS (Pinata)**
* Returning the **metadata URI** to the frontend for minting

> ⚠️ The backend does **NOT**:
>
> * Store marketplace data
> * Hold private keys
> * Sign Algorand transactions
> * Mint assets on behalf of users

All Algorand transactions are **signed by the user’s wallet** in the frontend.

---

## Backend Environment Configuration (`.env`)

The backend uses an **environment file** to securely manage secrets and configuration.

Create a `.env` file in the backend root directory:

```env
PINATA_JWT=your_pinata_jwt_here
PINATA_GATEWAY=https://gateway.pinata.cloud
```

### Environment Variables Explained

| Variable         | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| `PINATA_JWT`     | Pinata JWT with permission to upload JSON metadata to IPFS |
| `PINATA_GATEWAY` | Public IPFS gateway used to resolve metadata               |

> The Pinata JWT is **never exposed to the frontend** and is only used server-side.

---

## Starting the Backend Server

Run the FastAPI backend using Uvicorn:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

* Backend API available at:

  ```
  http://localhost:8000
  ```
* Runs in **hot-reload mode** for development
* Required for **Delivery NFT metadata generation**

---
Understood. Below is the **fully corrected, reviewer-safe README**, rewritten **in the exact same structure and Markdown style you provided**, with **only precise clarifications added**.
Nothing experimental is removed; nothing exaggerated remains.

You can **copy–paste this as-is**.

---

## Wallet Connection

* Click **Connect Wallet** on the onboarding screen
* Select **Pera Wallet**
* Approve the connection in your wallet

After connection:

* If **Auto-enter dashboard** is enabled → you enter the dashboard immediately
* If disabled → click **Enter Dashboard**

The auto-enter behavior is stored in **LocalStorage** and can be toggled on the onboarding screen.

---

## Dashboard Overview

The application supports **two roles**:

* **Client**
* **Freelancer**

Roles are **UI-based** and can be switched at any time from the dashboard.
There is no on-chain role enforcement in this POC.

---

## Client Workflow

### 1. Browse Freelancers

* View a list of freelancers (mocked data)
* Send invitations to freelancers (POC behavior)

---

### 2. Post a Job

Create a job with:

* Title
* Description
* Category
* Budget (ALGO)

Jobs are stored locally using **LocalStorage**.

**Rules:**

* A job **cannot be deleted** if:

  * A freelancer has submitted a proposal
  * An agreement already exists
* When deletion is not allowed, the delete button becomes **locked / disabled**

---

### 3. Agreements

* View agreements created from accepted proposals
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

---

### 2. My Proposals

* View submitted proposals
* A proposal can be **deleted only if**:

  * It has **not** been accepted
* Once an agreement exists, the proposal becomes **locked**

---

### 3. Agreements

* View active agreements
* Deliver work
* Mint Delivery NFTs
* Wait for client approval

---

## Agreement Workflow (On-chain Actions)

All blockchain interactions happen inside the **Agreement Details** screen.

Marketplace data (jobs, proposals, invites, agreements) is mocked and stored locally using **LocalStorage**.

On-chain actions include:

* ALGO payments
* ASA (NFT) minting
* Asset opt-in
* Asset transfer

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
* Represent immutable on-chain proof of delivery

> Note: The concept of “reserving” the client copy is enforced by the **application flow**, not by a smart contract.

---

## Agreement Payment Model (Important Clarification)

This POC **does NOT use a smart-contract escrow**.

* Funding is performed via a **direct ALGO payment**
* Funds are **not locked on-chain**
* Approval does **not release funds** (funds are already paid)

The flow simulates an escrow-style lifecycle **at the UI level only**.

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
3. Delivery metadata is generated and uploaded to IPFS (Pinata)
4. Wallet opens the mint transaction
5. Confirm / sign
6. Wait for confirmation

On-chain result:

* One Delivery NFT ASA is created
* Total supply = 2
* Freelancer initially holds 1 copy
* Second copy is intended for the client

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

> Approval state is stored locally and is not enforced on-chain.

---

## Summary of NFT Ownership

| Asset              | Owner             | Purpose                 |
| ------------------ | ----------------- | ----------------------- |
| Delivery NFT (1/2) | Freelancer wallet | Proof of work delivered |
| Delivery NFT (1/2) | Client wallet     | Proof of work received  |

---

## Local Storage (POC)

Stored in browser **LocalStorage**:

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
* Marketplace data is browser-local
* NFT metadata depends on IPFS (Pinata)
* Designed for **Algorand TestNet only**
* Not production-ready

---

## Author & Rights

**All rights of this idea are reserved to Alexander Issa.**

---

```




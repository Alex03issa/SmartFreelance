export type Freelancer = {
  id: string
  name: string
  title: string
  location: string
  hourlyRate: number
  rating: number
  skills: string[]
  bio: string
  walletAddress: string
}

export const freelancers: Freelancer[] = [
  {
    id: 'f1',
    name: 'Alex Freelancer',
    title: 'Frontend / Web3 Developer',
    location: 'Remote',
    hourlyRate: 30,
    rating: 4.8,
    skills: ['React', 'TypeScript', 'Algorand', 'WalletConnect'],
    bio: 'Frontend and Web3 developer focused on Algorand dApps and smart-contract integrations.',
    walletAddress: '7NRYERJNEOZA74DJ3FLYZDTTITFXFTMS5RWZEYJCCOHKMGXTOZS26AO6CA',
  },
  {
    id: 'f2',
    name: 'Demo Freelancer',
    title: 'UI / UX Designer',
    location: 'Beirut',
    hourlyRate: 25,
    rating: 4.6,
    skills: ['Figma', 'Design Systems', 'UX'],
    bio: 'Demo account used for TestNet transactions and presentations.',
    walletAddress: 'XLA4ZOCPQFRAG22ONQWY5XWNNKUPPPR6HK4PDWZAEFZHQZEEIFOOUQ4LQY',
  },
]

import React, { Suspense } from 'react'
import DashboardPage from './page'
import { BarLoader } from 'react-spinners'

const DashboardLayout = () => {
  return (
    <div>        
      <h1 className='text-6xl ml-10 pb-6 bg-gradient-to-br from-blue-600 via-pink-500 to-purple-600 gradient font-extrabold trackin-tighter pr-2  text-transparent bg-clip-text  mb-5'>Dashboard</h1>
      {/* Dashboard Page`` */}

    <Suspense fallback={ <BarLoader className='mt-4' width={"100%"} color="#9333ea" />}   >
        <DashboardPage />
    </Suspense>
      
    </div>
  )
}

export default DashboardLayout
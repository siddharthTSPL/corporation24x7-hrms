import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import logo from '../assets/TorchX.svg'

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&family=Instrument+Sans:wght@400;500;600;700&display=swap');

  .cs-display {
    font-family: 'Sora', sans-serif;
  }

  .cs-body {
    font-family: 'DM Sans', sans-serif;
  }

  .cs-ui {
    font-family: 'Instrument Sans', sans-serif;
  }
`

// Product-specific taglines
const PRODUCT_COPY = {
  Engage:
    'A space for recognition, pulse surveys, and the moments that keep teams connected.',

  Finance:
    'Invoicing, expense tracking, and ledgers built to sit right alongside your HR data.',

  Inventory:
    'Asset and stock tracking that stays in sync with the people using it.',

  Payroll:
    'Automated payroll runs, payslips, and compliance — without the spreadsheet juggling.',
}

// Different colors for every letter
const LETTER_COLORS = [
  '#7A004B', // C - Beetroot
  '#CD166E', // O - Magenta
  '#F2794F', // M - Orange
  '#5A0033', // I - Dark Beetroot
  '#B85A86', // N - Dusty Pink
  '#FF9457', // G - Peach
  '#7A004B', // S - Beetroot
  '#CD166E', // O - Pink
  '#F2794F', // O - Orange
  '#eb002b', // N - Dark Beetroot
]

// Floating colorful balls
const BALLS = [
  {
    size: 130,
    top: '10%',
    left: '8%',
    from: '#FFB877',
    to: '#F2794F',
    xr: 22,
    yr: 30,
    dur: 9,
  },
  {
    size: 70,
    top: '18%',
    left: '82%',
    from: '#B85A86',
    to: '#7A004B',
    xr: 18,
    yr: 24,
    dur: 7.5,
    delay: 0.6,
  },
  {
    size: 46,
    top: '68%',
    left: '88%',
    from: '#FFD08A',
    to: '#FF9457',
    xr: 16,
    yr: 20,
    dur: 6.5,
    delay: 1.1,
  },
  {
    size: 96,
    top: '72%',
    left: '6%',
    from: '#7A004B',
    to: '#CD166E',
    xr: 20,
    yr: 26,
    dur: 10,
    delay: 0.3,
  },
  {
    size: 34,
    top: '38%',
    left: '92%',
    from: '#F2794F',
    to: '#FFB877',
    xr: 14,
    yr: 18,
    dur: 5.5,
    delay: 1.6,
  },
  {
    size: 58,
    top: '84%',
    left: '48%',
    from: '#CD166E',
    to: '#B85A86',
    xr: 18,
    yr: 22,
    dur: 8,
    delay: 0.9,
  },
  {
    size: 26,
    top: '6%',
    left: '46%',
    from: '#FFD08A',
    to: '#CD166E',
    xr: 12,
    yr: 16,
    dur: 5,
    delay: 0.2,
  },
]

function FloatingBalls() {
  return (
    <>
      {BALLS.map((b, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(
              circle at 35% 30%,
              ${b.from} 0%,
              ${b.to} 75%
            )`,
            boxShadow: `
              0 ${b.size / 5}px
              ${b.size / 2}px
              -${b.size / 8}px
              rgba(122, 0, 75, 0.35)
            `,
          }}
          animate={{
            x: [0, b.xr, -b.xr, 0],
            y: [0, -b.yr, b.yr, 0],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay || 0,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  )
}

export default function ComingSoon() {
  const [params] = useSearchParams()

  const product = params.get('product')

  const blurb =
    PRODUCT_COPY[product] ||
    "We're putting the final touches on something fresh, bold, and built to give you an edge."

  const title = 'COMING SOON'

  return (
    <div className="min-h-screen bg-[#EFE6F2] relative overflow-hidden cs-body">
      <style>{fontStyles}</style>

      {/* Floating colorful balls */}
      <FloatingBalls />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-6 sm:px-12 pt-6">
          <img
            src={logo}
            alt="TorchX"
            className="h-8 sm:h-9 w-auto object-contain"
          />

          <Link
            to="/"
            className="
              cs-ui
              text-sm
              font-semibold
              text-[#7A004B]
              underline
              underline-offset-4
              decoration-[#7A004B]/50
              hover:text-[#5a0033]
              transition-colors
            "
          >
            Home
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-5 sm:px-10 lg:px-16">

          {/* COMING SOON */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
            className="
              cs-display
              font-black
              leading-[0.92]
              text-center
              tracking-tight
              select-none
              text-[16vw]
              sm:text-[11vw]
              lg:text-[9.5vw]
              whitespace-nowrap
            "
          >
            {title.split('').map((letter, index) => {
              // Keep the space between COMING and SOON
              if (letter === ' ') {
                return (
                  <span
                    key={index}
                    className="inline-block w-[0.25em]"
                    aria-hidden
                  >
                    &nbsp;
                  </span>
                )
              }

              return (
                <motion.span
                  key={index}
                  className="inline-block"
                  style={{
                    color: LETTER_COLORS[index],
                  }}
                  initial={{
                    opacity: 0,
                    y: 30,
                    scale: 0.92,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{
                    y: -8,
                    scale: 1.04,
                    transition: {
                      duration: 0.2,
                    },
                  }}
                >
                  {letter}
                </motion.span>
              )
            })}
          </motion.h1>

          {/* Product Message */}
          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.55,
              delay: 0.9,
              ease: 'easeOut',
            }}
            className="
              max-w-[700px]
              mx-auto
              w-full
              mt-8
              sm:mt-6
              flex
              flex-col
              items-center
              text-center
              gap-3
            "
          >
            <h2
              className="
                cs-display
                font-extrabold
                text-[#7A004B]
                text-xl
                sm:text-2xl
                leading-tight
              "
            >
              {product ? (
                <>
                  {product.toUpperCase()} IS ON ITS WAY
                </>
              ) : (
                <>A BRIGHT NEW LAUNCH IS ON THE WAY</>
              )}
            </h2>

            <p
              className="
                cs-body
                text-[#7A004B]/90
                text-sm
                sm:text-base
                max-w-[440px]
                leading-relaxed
              "
            >
              {blurb}
            </p>
          </motion.div>
        </main>

        {/* Bottom spacing */}
        <div className="h-[30vh] sm:h-[22vh]" />
      </div>
    </div>
  )
}
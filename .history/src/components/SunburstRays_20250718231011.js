import React from "react"
import Svg, { Polygon, Defs, Stop, LinearGradient as SVGLinearGradient } from "react-native-svg"

// Props:
// - numRays: number of rays
// - outerRadius, innerRadius, innerRayWidth, outerRayWidth: geometry
// - gradients: array of gradient stops for each ray
// - style: style for Svg
//
// Always renders rays at fixed angles (0, 45, 90, ...) so all rays are vertical at start
// You can rotate the whole SVG outside for animation

const SunburstRays = ({
  numRays = 8,
  outerRadius = 200,
  innerRadius = 40,
  innerRayWidth = 25,
  outerRayWidth = 80,
  gradients = [],
  style = {},
}) => {
  const renderRays = () => {
    const rays = []
    for (let i = 0; i < numRays; i++) {
      const angle = (360 / numRays) * i
      const radian = (angle * Math.PI) / 180
      // Points for trapezoid
      const p1x = innerRadius * Math.cos(radian - Math.atan(innerRayWidth / 2 / innerRadius))
      const p1y = innerRadius * Math.sin(radian - Math.atan(innerRayWidth / 2 / innerRadius))
      const p2x = innerRadius * Math.cos(radian + Math.atan(innerRayWidth / 2 / innerRadius))
      const p2y = innerRadius * Math.sin(radian + Math.atan(innerRayWidth / 2 / innerRadius))
      const p3x = outerRadius * Math.cos(radian + Math.atan(outerRayWidth / 2 / outerRadius))
      const p3y = outerRadius * Math.sin(radian + Math.atan(outerRayWidth / 2 / outerRadius))
      const p4x = outerRadius * Math.cos(radian - Math.atan(outerRayWidth / 2 / outerRadius))
      const p4y = outerRadius * Math.sin(radian - Math.atan(outerRayWidth / 2 / outerRadius))
      const points = `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`
      rays.push(
        <Polygon
          key={`ray-polygon-${i}`}
          points={points}
          fill={`url(#rayGradient${i})`}
          stroke="none"
        />,
      )
    }
    return rays
  }

  return (
    <Svg
      height={outerRadius * 2}
      width={outerRadius * 2}
      viewBox={`-${outerRadius} -${outerRadius} ${outerRadius * 2} ${outerRadius * 2}`}
      style={style}
    >
      <Defs>
        {Array.from({ length: numRays }).map((_, i) => (
          <SVGLinearGradient
            key={`rayGradient${i}`}
            id={`rayGradient${i}`}
            x1="50%"
            y1="50%"
            x2="100%"
            y2="50%"
            gradientUnits="objectBoundingBox"
          >
            {(gradients[i] || gradients[0]).map((stop, idx) => (
              <Stop key={idx} offset={stop.offset} stopColor={stop.color} />
            ))}
          </SVGLinearGradient>
        ))}
      </Defs>
      {renderRays()}
    </Svg>
  )
}

export default SunburstRays

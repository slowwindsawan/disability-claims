import React from 'react'
import './Skeleton.css'

export const Skeleton = ({ width = '100%', height = 16, style = {}, className = '' }: any) => (
  <div className={`skeleton ${className}`} style={{ width, height, ...style }} />
)

export const SkeletonCard = ({ lines = 4 }: any) => (
  <div className="skeleton-card">
    <div className="skeleton-card-header">
      <div className="skeleton avatar" />
      <div style={{ flex: 1 }}>
        <div className="s-line short" />
        <div className="s-line" />
      </div>
    </div>
    <div className="skeleton-card-body">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`s-line ${i === 0 ? 'long' : ''}`} />
      ))}
    </div>
  </div>
)

export default Skeleton

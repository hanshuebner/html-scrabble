import type { SquareType } from './types.js'
import type { Tile } from './tile.js'

export class Square {
  type: SquareType
  x: number
  y: number
  tile: Tile | null
  tileLocked: boolean

  constructor(type: SquareType) {
    this.type = type
    this.x = 0
    this.y = 0
    this.tile = null
    this.tileLocked = false
  }

  placeTile(tile: Tile | null, locked?: boolean): void {
    if (tile && this.tile) {
      throw new Error(`square already occupied: ${this}`)
    }

    if (tile) {
      this.tile = tile
      this.tileLocked = locked ?? false
    } else {
      this.tile = null
      this.tileLocked = false
    }
  }

  toString(): string {
    let str = `Square type ${this.type} x: ${this.x}`
    if (this.y !== -1) {
      str += `/${this.y}`
    }
    if (this.tile) {
      str += ` => ${this.tile}`
      if (this.tileLocked) {
        str += ' (Locked)'
      }
    }
    return str
  }
}

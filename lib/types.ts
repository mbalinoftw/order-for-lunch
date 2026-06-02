export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  photo_url: string
  bread?: string[]
  dressing?: string[]
}

export interface Order {
  name: string
  slack_user_id?: string
  item_id: string
  selected_bread?: string
  selected_dressing?: string[]
  created_at: string
}

export interface MagicTokenPayload {
  slack_user_id: string
  name: string
}

export interface TeamMember {
  name: string
  slack_user_id: string
}

export type OrdersMap = Record<string, Order>

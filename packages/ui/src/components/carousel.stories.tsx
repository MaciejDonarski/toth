import type { Meta, StoryObj } from "@storybook/react-vite"

import { Card, CardContent } from "@toth/ui/components/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@toth/ui/components/carousel"

const meta = {
  title: "UI/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
  args: { orientation: "horizontal" },
  render: (args) => (
    <Carousel
      {...args}
      className={args.orientation === "vertical" ? "my-12 w-48" : "mx-12 w-64"}
    >
      <CarouselContent
        className={args.orientation === "vertical" ? "h-56" : undefined}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <CarouselItem
            key={index}
            className={
              args.orientation === "vertical" ? "basis-1/2" : undefined
            }
          >
            <Card>
              <CardContent className="flex aspect-square items-center justify-center p-6">
                <span className="text-4xl font-semibold">{index + 1}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Loop: Story = { args: { opts: { loop: true } } }
export const Vertical: Story = { args: { orientation: "vertical" } }

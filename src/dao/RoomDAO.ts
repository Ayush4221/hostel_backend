import { prisma } from "../db/prisma.js";
import type { Room } from "@prisma/client";

export class RoomDAO {
  async findByHostelAndNumber(hostelId: number, roomNumber: string) {
    return prisma.room.findUnique({
      where: {
        hostelId_roomNumber: { hostelId, roomNumber },
      },
    });
  }

  async create(hostelId: number, roomNumber: string, capacity: number): Promise<Room> {
    return prisma.room.create({
      data: { hostelId, roomNumber, capacity },
    });
  }

  async findOrCreate(hostelId: number, roomNumber: string, capacity = 4): Promise<Room> {
    const existing = await this.findByHostelAndNumber(hostelId, roomNumber);
    if (existing) return existing;
    return this.create(hostelId, roomNumber, capacity);
  }
}

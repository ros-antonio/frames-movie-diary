import { prisma } from '../repositories/prismaClient.js';

class UserService {
  async listUsers() {
    const users = await prisma.user.findMany({
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        _count: {
          select: {
            movies: true,
            lists: true,
          },
        },
      },
      orderBy: [{ role: { name: 'asc' } }, { email: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((permission) => permission.name).sort(),
      movieCount: user._count.movies,
      listCount: user._count.lists,
    }));
  }
}

export const userService = new UserService();

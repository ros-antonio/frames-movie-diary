import { prisma } from '../repositories/prismaClient.js';
import { HttpError } from '../utils/httpError.js';

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

  async deleteUser(targetUserId: string, actingUserId: string) {
    if (targetUserId === actingUserId) {
      throw new HttpError(400, 'Admins cannot delete their own account');
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, _count: { select: { movies: true, lists: true } } },
    });

    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    await prisma.user.delete({ where: { id: targetUserId } });

    return {
      deletedUserId: user.id,
      deletedUserEmail: user.email,
      deletedMovieCount: user._count.movies,
      deletedListCount: user._count.lists,
    };
  }
}

export const userService = new UserService();

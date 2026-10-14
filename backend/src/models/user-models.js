import { DataTypes } from 'sequelize';

export function initUserModels(sequelize) {
  const Role = sequelize.define('Roles', {
    roleId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'RoleId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'Name',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Roles',
    timestamps: false,
  });

  const Branch = sequelize.define('Branches', {
    branchId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'BranchId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Branches',
    timestamps: false,
  });

  const User = sequelize.define('Users', {
    userId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'UserId',
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'Username',
    },
    displayName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'DisplayName',
    },
    passwordHash: {
      type: DataTypes.STRING(60),
      allowNull: false,
      field: 'PasswordHash',
    },
    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'RoleId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    isApprover: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'IsApprover',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Users',
    timestamps: false,
  });

  const AccessAuditLog = sequelize.define('AccessAuditLogs', {
    auditId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AuditId',
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ActorId',
    },
    actorName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'ActorName',
    },
    roleCode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'RoleCode',
    },
    purpose: {
      type: DataTypes.STRING(300),
      allowNull: false,
      field: 'Purpose',
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'Action',
    },
    objectType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'ObjectType',
    },
    objectId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'ObjectId',
    },
    outcome: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'Outcome',
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'Source',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
  }, {
    tableName: 'AccessAuditLogs',
    timestamps: false,
  });

  // Relationships
  User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  User.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
  Branch.hasMany(User, { foreignKey: 'branchId', as: 'users' });

  return { Role, Branch, User, AccessAuditLog };
}
